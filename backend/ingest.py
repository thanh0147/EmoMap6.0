import os
import uuid
from supabase import create_client, Client
from llama_index.core import SimpleDirectoryReader
from llama_index.core.node_parser import SentenceSplitter
from llama_index.embeddings.huggingface import HuggingFaceEmbedding
import re
# --- 1. CẤU HÌNH ---
# Thay thông tin của bạn vào đây
SUPABASE_URL = "https://rlbcntrphqnwlbceelbg.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsYmNudHJwaHFud2xiY2VlbGJnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Nzc5MTExMiwiZXhwIjoyMDgzMzY3MTEyfQ.o94ziNVTum8EccgKfRVX29ewGjb7gNYrPEFOXNSZIU0"

# Model Embedding (Phải khớp với file main.py và Database)
print("⏳ Đang tải Model Embedding (HuggingFace)...")
# Trong file ingest.py
# ĐỔI TỪ model cũ SANG model đa ngôn ngữ này:
embed_model = HuggingFaceEmbedding(model_name="sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2")

# Kết nối Supabase qua HTTP
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def ingest_data():
    # --- 2. ĐỌC VÀ CẮT NHỎ TÀI LIỆU ---
    print("📂 Đang đọc tài liệu từ thư mục 'data'...")
    
    # Kiểm tra thư mục data
    if not os.path.exists("./data_source"):
        print("❌ Lỗi: Không thấy thư mục 'data'. Hãy tạo nó và bỏ file vào.")
        return

    documents = SimpleDirectoryReader("./data_source").load_data()
    print(f"✅ Đã tìm thấy {len(documents)} tài liệu gốc.")

    for doc in documents:
        # Làm sạch văn bản gốc trước khi chia nhỏ (chunking)
        doc.text = re.sub(r'\s+', ' ', doc.text).strip()


    # Cắt nhỏ văn bản (Chunking) - Mỗi đoạn khoảng 512 ký tự
    parser = SentenceSplitter(chunk_size=512, chunk_overlap=50)
    nodes = parser.get_nodes_from_documents(documents)
    print(f"✂️ Đã cắt thành {len(nodes)} đoạn nhỏ (chunks).")

    # --- 3. TẠO VECTOR VÀ UPLOAD ---
    print("🚀 Đang tạo Vector và đẩy lên Supabase (qua HTTP)...")
    
    data_to_insert = []
    
    for i, node in enumerate(nodes):
        # Lấy nội dung văn bản
        content = node.get_content()
        
        # === 🛠️ SỬA LỖI TẠI ĐÂY (THÊM DÒNG NÀY) ===
        # Lọc bỏ ký tự Null Byte (\x00) gây lỗi database
        if content:
            content = content.replace("\x00", "") 
        # ==========================================

        # Nếu lọc xong mà nội dung rỗng thì bỏ qua
        if not content:
            continue

        # Tạo vector (Embedding)
        try:
            embedding = embed_model.get_text_embedding(content)
        except Exception as e:
            print(f"⚠️ Lỗi khi tạo vector cho đoạn {i}: {e}")
            continue
        
        # Chuẩn bị dữ liệu để insert
        record = {
            "id": str(uuid.uuid4()),
            "content": content,           
            "embedding": embedding,
            "metadata": node.metadata     
        }
        data_to_insert.append(record)
        
        if (i + 1) % 10 == 0:
            print(f"   -> Đã xử lý {i + 1}/{len(nodes)} đoạn...")

    # --- 4. GỬI LÊN SUPABASE (BATCH INSERT) ---
    # Gửi từng gói 50 dòng để tránh quá tải
    batch_size = 50
    total_inserted = 0
    
    try:
        for i in range(0, len(data_to_insert), batch_size):
            batch = data_to_insert[i : i + batch_size]
            
            # Gọi API insert của Supabase
            supabase.table("vectors").insert(batch).execute()
            
            total_inserted += len(batch)
            print(f"✅ Đã upload thành công {total_inserted}/{len(data_to_insert)} dòng.")
            
        print("\n🎉 HOÀN TẤT! Dữ liệu đã lên mây thành công.")
        
    except Exception as e:
        print(f"\n❌ LỖI UPLOAD: {e}")
        print("💡 Gợi ý: Nếu lỗi 'Permission denied' hoặc 'new row violates RLS policy':")
        print("   -> Hãy vào Supabase -> Project Settings -> API -> Copy 'service_role' key")
        print("   -> Thay thế SUPABASE_KEY trong code bằng Service Role Key này.")

if __name__ == "__main__":
    ingest_data()