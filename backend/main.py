from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import os
import random
import urllib.parse
import re
import time
# Import các thành phần Core của LlamaIndex
from llama_index.core import QueryBundle, Settings
from llama_index.core.retrievers import BaseRetriever
from llama_index.core.schema import NodeWithScore, TextNode
from llama_index.core.query_engine import RetrieverQueryEngine
from llama_index.core.response_synthesizers import get_response_synthesizer
from llama_index.core import PromptTemplate

# Import Embeddings và LLM
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from llama_index.llms.groq import Groq

from dotenv import load_dotenv
from supabase.client import Client, create_client
load_dotenv()
# --- 1. CẤU HÌNH API KEYS & DB ---
# Hãy thay bằng Key thật của bạn
GOOGLE_API_KEY = "AIzaSyDrJuh3O17mbSy3BP4uxWYt09LtnOF9a5E" 
GROQ_API_KEY = "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" 

PROJECT_REF = "rlbcntrphqnwlbceelbg" 


SUPABASE_URL = "https://rlbcntrphqnwlbceelbg.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsYmNudHJwaHFud2xiY2VlbGJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTExMTIsImV4cCI6MjA4MzM2NzExMn0.jYHOkNSAq9Syhwvn0B0OgFoPX2ss_PdRdhXXNo7qWY0"

supabase_client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
# Trong file ingest.py
# ĐỔI TỪ model cũ SANG model đa ngôn ngữ này:
embed_model = HuggingFaceEmbedding(model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")
Settings.embed_model = embed_model
# --- 2. THIẾT LẬP "BỘ NÃO" LAI (HYBRID BRAIN) ---

# Model trả lời (Groq)
llm = Groq(
    model="llama-3.3-70b-versatile",
    api_key=GROQ_API_KEY
)
Settings.llm = llm
# --- 2. MODEL DỮ LIỆU (Pydantic) ---
# Định nghĩa khuôn mẫu dữ liệu frontend gửi lên
class UserAnswer(BaseModel):
    question_id: str
    answer_value: int  # 1 đến 5

class TestSubmission(BaseModel):
    answers: List[UserAnswer]

# --- 3. KHỞI TẠO APP ---
app = FastAPI(
    title="Hệ thống Sàng lọc Tâm lý Học đường",
    description="API cung cấp câu hỏi và chấm điểm test",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# --- 3. VIẾT CUSTOM RETRIEVER (CẦU NỐI GIỮA URL/KEY VÀ LLAMAINDEX) ---
# Class này sẽ dùng URL/Key để lấy dữ liệu, sau đó chuyển đổi thành format LlamaIndex hiểu
class SupabaseRPCRetriever(BaseRetriever):
    def __init__(self, client: Client, embed_model: HuggingFaceEmbedding):
        self.client = client
        self.embed_model = embed_model
        super().__init__()

    def _retrieve(self, query_bundle: QueryBundle) -> List[NodeWithScore]:
        # 1. Mã hóa câu hỏi thành vector
        query_embedding = self.embed_model.get_query_embedding(query_bundle.query_str)
        
        # 2. Gọi hàm RPC 'match_documents' trên Supabase (như cách cũ bạn dùng)
        params = {
            "query_embedding": query_embedding,
            "match_threshold": 0.3, # Độ tương đồng tối thiểu
            "match_count": 4        # Lấy 3 kết quả tốt nhất
        }
        
        try:
            # Gọi Supabase qua HTTP API
            response = self.client.rpc("match_documents", params).execute()
            data = response.data
            print(f"📊 Tìm thấy {len(data)} đoạn văn bản liên quan.")
        except Exception as e:
            print(f"Lỗi khi gọi Supabase RPC: {e}")
            return []

        # 3. Chuyển đổi kết quả JSON từ Supabase thành các Node của LlamaIndex
        nodes = []
        for item in data:
            # Lưu ý: Kiểm tra tên cột trong database của bạn (thường là 'content' hoặc 'page_content')
            text_content = item.get('content') or item.get('page_content') or ""
            metadata = item.get('metadata') or {}
            score = item.get('similarity', 0.0)
            
            
            print(f"📝 Metadata tìm được: {metadata}")
            
            node = TextNode(text=text_content, metadata=metadata)
            nodes.append(NodeWithScore(node=node, score=score))
            
        return nodes
# Khởi tạo Retriever
retriever = SupabaseRPCRetriever(supabase_client, embed_model)

# Tạo Query Engine (Bộ máy trả lời câu hỏi) kết hợp Retriever và LLM
# response_mode="compact": Trả lời ngắn gọn, súc tích
response_synthesizer = get_response_synthesizer(response_mode="compact")
query_engine = RetrieverQueryEngine(
    retriever=retriever,
    response_synthesizer=response_synthesizer
)
# --- 4. API ENDPOINTS ---

@app.get("/")
def read_root():
    return {"message": "Server đang chạy ngon lành! 🚀"}
@app.get("/api/questions")
def get_random_test():
    """
    Tạo đề thi ngẫu nhiên gồm 10 câu:
    - 3 câu mức 1
    - 4 câu mức 2
    - 3 câu mức 3
    """
    try:
        # B1: Lấy toàn bộ câu hỏi (Vì data ít nên lấy 1 lần cho nhanh)
        response = supabase_client.table("questions").select("*").execute()
        all_questions = response.data
        
        # B2: Chia nhóm theo trọng số
        pool_1 = [q for q in all_questions if q['weight'] == 1]
        pool_2 = [q for q in all_questions if q['weight'] == 2]
        pool_3 = [q for q in all_questions if q['weight'] == 3]

        # Kiểm tra xem Database có đủ câu hỏi để rút không
        if len(pool_1) < 3 or len(pool_2) < 4 or len(pool_3) < 3:
            raise HTTPException(status_code=500, detail="Database chưa đủ câu hỏi để tạo đề thi!")

        # B3: Rút thăm ngẫu nhiên (Sampling)
        selected_q = []
        selected_q.extend(random.sample(pool_1, 3))
        selected_q.extend(random.sample(pool_2, 4))
        selected_q.extend(random.sample(pool_3, 3))

        # B4: Trộn đều thứ tự để không bị lộ mức độ
        random.shuffle(selected_q)

        return {
            "status": "success",
            "total": len(selected_q), # Sẽ luôn là 10
            "data": selected_q
        }
    except Exception as e:
        print(f"Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/submit-test")
def submit_test(submission: TestSubmission):
    """
    Chấm điểm 10 câu hỏi
    """
    try:
        # B1: Vẫn lấy toàn bộ câu hỏi về để tra cứu trọng số (Lookup)
        q_response = supabase_client.table("questions").select("id, weight").execute()
        question_map = {q['id']: q for q in q_response.data}
        
        total_score = 0
        max_possible_score = 0
        red_flag_triggered = False
        details_to_insert = []

        # B2: Duyệt qua 10 câu trả lời của user
        for item in submission.answers:
            q_info = question_map.get(item.question_id)
            if q_info:
                w = q_info['weight']
                v = item.answer_value
                
                total_score += w * v
                max_possible_score += w * 5 
                
                # Logic Red Flag giữ nguyên: Trọng số 3 mà chọn >= 4 là BÁO ĐỘNG
                if w == 3 and v >= 4:
                    red_flag_triggered = True
                
                details_to_insert.append({
                    "question_id": item.question_id, 
                    "answer_value": v
                })

        # B3: Tính mức độ rủi ro
        # Với cấu trúc 3-4-3:
        # Max Score = (3*1*5) + (4*2*5) + (3*3*5) = 15 + 40 + 45 = 100 điểm.
        # Rất đẹp để tính phần trăm!
        
        percentage = 0
        if max_possible_score > 0:
            percentage = total_score / max_possible_score

        risk_level = "GREEN"
        if red_flag_triggered: 
            risk_level = "RED"
        elif percentage >= 0.7: # >= 70 điểm
            risk_level = "RED"
        elif percentage >= 0.4: # >= 40 điểm
            risk_level = "YELLOW"
        
        # B4: Lưu DB (Không đổi)
        session_res = supabase_client.table("test_sessions").insert({
            "total_score": total_score,
            "risk_level": risk_level,
            "red_flag_triggered": red_flag_triggered
        }).execute()
        
        sid = session_res.data[0]['session_id']
        for d in details_to_insert: d['session_id'] = sid
        supabase_client.table("test_details").insert(details_to_insert).execute()

        return {
            "status": "success",
            "session_id": sid,
            "result": {
                "score": total_score,
                "max_score": max_possible_score,
                "risk_level": risk_level,
                "red_flag": red_flag_triggered,
                "message": get_message(risk_level)
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def get_message(level):
    if level == "RED": return "CẢNH BÁO: Cần hỗ trợ gấp!"
    if level == "YELLOW": return "Cẩn trọng: Bạn đang căng thẳng."
    return "Ổn: Tinh thần tích cực."
custom_prompt_str = """
    Bạn là một chuyên gia tư vấn tâm lý học đường tên là “Emo” – một người bạn lớn luôn sẵn sàng lắng nghe học sinh.
    Phong cách trả lời:
    - Giọng điệu nhẹ nhàng, gần gũi, ấm áp, không phán xét
    - Trả lời ngắn gọn (10 câu), dễ hiểu, giống như trò chuyện đời thường
    - Ưu tiên chia sẻ, lắng nghe và đồng cảm, chưa vội phân tích hay đưa lời khuyên dài
    Ngữ cảnh để tham khảo khi trả lời: {context_str}
    Nguyên tắc phản hồi:
    - Nếu thông tin chưa đủ, hãy hỏi thêm bằng câu hỏi nhẹ nhàng, không dồn dập.
    - Chỉ đưa lời khuyên rất nhỏ hoặc lời động viên, tránh giảng giải.
    - Luôn kết thúc bằng một câu hỏi mở ngắn, thân thiện, giúp học sinh dễ nói tiếp.
    - Luôn trả lời bằng tiếng Việt, xưng hô thân thiện (Emo – bạn).
    Câu hỏi của học sinh:
    {query_str}
    """

# Tạo đối tượng PromptTemplate
qa_template = PromptTemplate(custom_prompt_str)

# Khởi tạo Retriever (Giữ nguyên như cũ)
retriever = SupabaseRPCRetriever(supabase_client, embed_model)

# B. GẮN PROMPT VÀO BỘ MÁY TỔNG HỢP (SYNTHESIZER)
# text_qa_template: Là mẫu template dùng để trả lời câu hỏi dựa trên text.
response_synthesizer = get_response_synthesizer(
    response_mode="compact",
    text_qa_template=qa_template,
    llm=llm # <--- ĐƯA PROMPT CỦA BẠN VÀO ĐÂY
)

# Tạo Query Engine
query_engine = RetrieverQueryEngine(
    retriever=retriever,
    response_synthesizer=response_synthesizer
)

class ChatRequest(BaseModel):
    message: str
# --- 4. API ENDPOINT ---
class ChatRequest(BaseModel):
    message: str

def clean_and_format_text(text):
    if not text: return ""
    
    # 1. Xóa các ký tự xuống dòng thừa
    text = text.replace('\n', ' ').replace('\r', '')
    
    # 2. Xử lý lỗi PDF tiếng Việt bị tách chữ (Ví dụ: "k h ô n g" -> "không")
    # Logic: Tìm các ký tự đơn lẻ đứng cạnh nhau và ghép lại
    # Regex này tìm: Ký tự (không phải khoảng trắng) -> Khoảng trắng -> Ký tự (không phải khoảng trắng)
    # Lưu ý: Có thể nối nhầm chữ tiếng Anh (vd: "I am" -> "Iam"), nhưng tốt cho tiếng Việt lỗi.
    text = re.sub(r'(?<=\b\S) (?=\S\b)', '', text)
    
    # 3. Xóa khoảng trắng kép
    text = re.sub(r'\s+', ' ', text).strip()
    
    return text

def smart_truncate(text, max_length=250):
    if len(text) <= max_length:
        return text
    
    # Cắt đến max_length
    cut_text = text[:max_length]
    
    # Tìm dấu chấm câu (.) hoặc dấu cách cuối cùng để cắt cho mượt
    last_dot = cut_text.rfind('.')
    last_space = cut_text.rfind(' ')
    
    # Ưu tiên cắt ở dấu chấm câu gần nhất
    if last_dot > max_length * 0.7: # Nếu dấu chấm nằm ở 30% cuối đoạn
        return cut_text[:last_dot+1]
    
    # Nếu không thì cắt ở dấu cách
    if last_space != -1:
        return cut_text[:last_space] + "..."
        
    return cut_text + "..."


DANGER_KEYWORDS = [
    "tự tử", "muốn chết", "chết đi", "nhảy lầu", "cắt tay", 
    "uống thuốc sâu", "bị đánh", "bắt nạt", "đánh hội đồng", 
    "cứu tôi", "giết", "đâm", "máu", "hoảng loạn", "không muốn sống"
]

def check_danger(text):
    text_lower = text.lower()
    for kw in DANGER_KEYWORDS:
        if kw in text_lower:
            return True
    return False

@app.post("/api/chat")
async def chat_with_ai(request: ChatRequest):
    user_message = request.message
    
    try:
        is_dangerous = check_danger(request.message)
        # A. LlamaIndex xử lý (Tìm kiếm -> Tổng hợp -> Trả lời)
        response = query_engine.query(user_message)
        
        # B. Lấy nguồn tham khảo (Source Nodes) để hiện Popup
        sources_data = []
        seen_contents = set()
        
        for node_with_score in response.source_nodes:
            node = node_with_score.node
            
            # Lấy tên file từ metadata
            # Supabase thường lưu tên file trong metadata['source'] hoặc metadata['file_name']
            file_name = node.metadata.get('file_name') or node.metadata.get('source') or 'Tài liệu tham khảo'
            page_label = node.metadata.get('page_label')
            # Lấy nội dung để hiển thị trích dẫn
            raw_content = node.get_content()
            clean_content = clean_and_format_text(raw_content)
            
            # 2. (Tùy chọn) Sửa lỗi tiếng Việt bị tách rời ký tự (ví dụ: "k h ô n g" -> "không")
            # Mẹo nhỏ: Nếu thấy 1 chữ cái đứng riêng lẻ giữa 2 dấu cách, có thể nó bị lỗi tách từ.
            # Tuy nhiên, chỉ bước 1 là đã giải quyết được 90% vấn đề hiển thị rồi.
            if len(clean_content) < 20 or clean_content in seen_contents:
                continue
            seen_contents.add(clean_content)
            final_snippet = smart_truncate(clean_content)
            
            source_display = file_name
            if page_label:
                source_display += f" (Trang {page_label})"

            sources_data.append({
                "source": source_display,
                "snippet": final_snippet
            })

        return {
            "status": "success",
            "reply": str(response),
            "sources": sources_data,
            "is_dangerous": is_dangerous
        }

    except Exception as e:
        print(f"Lỗi Server: {e}")
        return {
            "status": "error", 
            "reply": "Xin lỗi, mình đang gặp chút sự cố kết nối dữ liệu.",
            "sources": []
        }
@app.get("/api/dashboard")
def get_dashboard_stats():
    """
    API Thống kê Dashboard:
    1. Tổng số bài test, điểm trung bình.
    2. Phân bố mức độ rủi ro (Green/Yellow/Red).
    3. Thống kê trung bình điểm của từng câu hỏi (Join test_details và questions).
    """
    try:
        # --- BƯỚC 1: Lấy dữ liệu tổng quan từ bảng test_sessions ---
        sessions_res = supabase_client.table("test_sessions").select("*").execute()
        sessions = sessions_res.data

        total_users = 0
        avg_score = 0
        risk_counts = {"GREEN": 0, "YELLOW": 0, "RED": 0}
        
        if sessions:
            total_users = len(sessions)
            # Tính điểm trung bình toàn trường
            total_sum = sum([s['total_score'] for s in sessions])
            avg_score = round(total_sum / total_users, 2)

            # Đếm số lượng theo mức độ rủi ro
            for s in sessions:
                r_level = s.get('risk_level', 'GREEN')
                if r_level in risk_counts:
                    risk_counts[r_level] += 1
                else:
                    # Fallback nếu có giá trị lạ
                    if "Other" not in risk_counts: risk_counts["Other"] = 0
                    risk_counts["Other"] += 1

        # --- BƯỚC 2: Tính trung bình từng câu hỏi từ bảng test_details ---
        
        # Lấy nội dung câu hỏi để hiển thị tên (thay vì ID)
        questions_res = supabase_client.table("questions").select("id, content").execute()
        # Tạo map: {1: "Bạn có thường xuyên...", 2: "..."}
        q_content_map = {q['id']: q['content'] for q in questions_res.data}

        # Lấy tất cả chi tiết câu trả lời
        details_res = supabase_client.table("test_details").select("question_id, answer_value").execute()
        details = details_res.data

        # Dictionary để gom nhóm: { question_id: [list_of_scores] }
        q_stats_temp = {}
        
        for d in details:
            qid = d['question_id']
            val = d['answer_value']
            
            if qid not in q_stats_temp:
                q_stats_temp[qid] = []
            q_stats_temp[qid].append(val)

        # Tính trung bình và format dữ liệu trả về
        question_stats_final = []
        
        # Sắp xếp theo question_id để biểu đồ hiển thị thứ tự câu 1 -> 10
        sorted_qids = sorted(q_stats_temp.keys())

        for qid in sorted_qids:
            scores = q_stats_temp[qid]
            avg_val = sum(scores) / len(scores) if scores else 0
            
            # Lấy nội dung câu hỏi, cắt ngắn nếu dài quá để hiển thị biểu đồ cho đẹp
            full_content = q_content_map.get(qid, f"Câu {qid}")
            short_content = (full_content[:30] + '..') if len(full_content) > 30 else full_content

            question_stats_final.append({
                "question": f"C{qid}: {short_content}", # Label hiển thị: "C1: Nội dung..."
                "full_question": full_content,           # Để hiển thị tooltip nếu cần
                "avg": round(avg_val, 2)
            })

        # --- BƯỚC 3: Trả về kết quả JSON ---
        return {
            "status": "success",
            "total_users": total_users,
            "avg_score": avg_score,
            # Format chuẩn cho Recharts (Pie Chart)
            "risk_distribution": [
                {"name": "An toàn", "value": risk_counts["GREEN"], "color": "#10B981"},      # Green
                {"name": "Cần theo dõi", "value": risk_counts["YELLOW"], "color": "#F59E0B"}, # Yellow
                {"name": "Nguy hiểm", "value": risk_counts["RED"], "color": "#EF4444"},       # Red
            ],
            # Format chuẩn cho Recharts (Bar Chart)
            "question_stats": question_stats_final
        }

    except Exception as e:
        print(f"Error Dashboard: {e}")
        return {"status": "error", "message": str(e), "total_users": 0, "avg_score": 0, "risk_distribution": [], "question_stats": []}
    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)