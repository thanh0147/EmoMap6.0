from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from supabase import create_client, Client
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import os
import random
import urllib.parse

import time
# --- IMPORT THƯ VIỆN MỚI (FIX LỖI DEPRECATED) ---
# --- IMPORT LLAMAINDEX (Chỉ dùng để Embed và Chat) ---
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
from langchain_community.vectorstores import SupabaseVectorStore
from llama_index.llms.groq import Groq
from dotenv import load_dotenv
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_groq import ChatGroq
from supabase.client import Client, create_client
from langchain_core.prompts import ChatPromptTemplate
load_dotenv()
# --- 1. CẤU HÌNH API KEYS & DB ---
# Hãy thay bằng Key thật của bạn
GOOGLE_API_KEY = "AIzaSyDrJuh3O17mbSy3BP4uxWYt09LtnOF9a5E" 
GROQ_API_KEY = "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" 

PROJECT_REF = "rlbcntrphqnwlbceelbg" 


# Thay thế bằng URL và KEY thực của bạn
SUPABASE_URL = "https://rlbcntrphqnwlbceelbg.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsYmNudHJwaHFud2xiY2VlbGJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTExMTIsImV4cCI6MjA4MzM2NzExMn0.jYHOkNSAq9Syhwvn0B0OgFoPX2ss_PdRdhXXNo7qWY0"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

vector_store = SupabaseVectorStore(
    client=supabase,
    embedding=embeddings,
    table_name="vectors",       # Tên bảng trong Supabase (mặc định là documents)
    query_name="match_documents"  # Tên hàm search trong SQL Supabase (mặc định là match_documents)
)
# --- 2. THIẾT LẬP "BỘ NÃO" LAI (HYBRID BRAIN) ---

embed_model = HuggingFaceEmbedding(model_name="BAAI/bge-small-en-v1.5")
# Model trả lời (Groq)
llm = Groq(
    model="llama-3.3-70b-versatile",
    api_key=GROQ_API_KEY
)
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
        response = supabase.table("questions").select("*").execute()
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
        q_response = supabase.table("questions").select("id, weight").execute()
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
        session_res = supabase.table("test_sessions").insert({
            "total_score": total_score,
            "risk_level": risk_level,
            "red_flag_triggered": red_flag_triggered
        }).execute()
        
        sid = session_res.data[0]['session_id']
        for d in details_to_insert: d['session_id'] = sid
        supabase.table("test_details").insert(details_to_insert).execute()

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

# Prompt đóng vai
SYSTEM_PROMPT = """
Bạn là trợ lý ảo tư vấn tâm lý học đường, tên là "Người Bạn Đồng Hành".
Nhiệm vụ: Trả lời câu hỏi của học sinh dựa trên thông tin được cung cấp.
Phong cách: Ân cần, lắng nghe, thấu hiểu, ngắn gọn nhưng đầy đủ.
Quy tắc quan trọng:
1. Nếu học sinh có dấu hiệu tiêu cực hoặc muốn tự sát -> Bắt buộc cung cấp hotline: 111 hoặc khuyên tìm gặp thầy cô/bố mẹ ngay.
2. Chỉ trả lời dựa trên "THÔNG TIN THAM KHẢO" bên dưới. Nếu không có thông tin, hãy khuyên em hỏi thầy cô phụ trách.
"""

class ChatRequest(BaseModel):
    message: str

# --- 5. HÀM XỬ LÝ CHAT ---
@app.post("/api/chat")
async def chat_with_ai(request: ChatRequest):
    user_message = request.message
        
        # 1. Tìm kiếm context từ Vector DB
        # Lấy top 3 đoạn liên quan nhất
    relevant_docs = vector_store.similarity_search(user_message, k=3)
        
        # 2. Xử lý nguồn tham khảo (SỬA ĐOẠN NÀY)
    sources_data = []
    context_text = ""
        
    for doc in relevant_docs:
            # Lấy tên file từ metadata (thường Supabase lưu là 'source' hoặc 'file_name')
            # Dùng hàm .get() để tránh lỗi nếu không có tên
        source_name = doc.metadata.get('source', 'Tài liệu tham khảo')
            
            # Làm sạch nội dung: Xóa xuống dòng thừa, xóa khoảng trắng thừa
        clean_content = doc.page_content.replace('\n', ' ').strip()
            
            # Cắt ngắn nội dung để làm trích dẫn (lấy 150 ký tự đầu)
        short_snippet = clean_content[:150] + "..." if len(clean_content) > 150 else clean_content
            
            # Gom text để đưa vào Prompt cho AI
        context_text += f"Nguồn '{source_name}': {clean_content}\n---\n"
            
            # Lưu vào danh sách để trả về cho Frontend
        sources_data.append({
            "source": source_name,  # Tên tài liệu
            "snippet": short_snippet # Trích dẫn ngắn gọn
        })

        # 3. Tạo Prompt và gửi cho Groq (Giữ nguyên)
        prompt_template = ChatPromptTemplate.from_template("""
        Bạn là một chuyên gia tư vấn tâm lý học đường thân thiện và thấu hiểu.
        Dựa vào thông tin sau đây để trả lời câu hỏi của học sinh.
        Nếu thông tin không có trong văn bản, hãy dùng kiến thức tâm lý chung để tư vấn nhẹ nhàng.
        
        Thông tin tham khảo:
        {context}
        
        Câu hỏi: {question}
        """)
        
        chain = prompt_template | llm
        response = chain.invoke({"context": context_text, "question": user_message})
        
        # 4. Trả về kết quả (SỬA ĐOẠN NÀY để trả về sources_data dạng Object)
        return {
            "status": "success",
            "reply": response.content,
            "sources": sources_data 
        }
    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)