# build_db.py
import os
import shutil
from langchain_community.document_loaders import PyPDFDirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_chroma import Chroma

# Đường dẫn (Tương đối)
DATA_PATH = "./data_source"
DB_PATH = "./chroma_db"

def create_vector_db():
    # 1. Xóa DB cũ nếu có (để làm sạch)
    if os.path.exists(DB_PATH):
        shutil.rmtree(DB_PATH)
        print("🧹 Đã xóa Database cũ.")

    # 2. Đọc PDF
    print("⏳ Đang đọc tài liệu PDF...")
    loader = PyPDFDirectoryLoader(DATA_PATH)
    documents = loader.load()
    if not documents:
        print("⚠️ Lỗi: Không thấy file PDF nào trong thư mục data_source!")
        return

    # 3. Cắt nhỏ văn bản
    text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=100)
    chunks = text_splitter.split_documents(documents)
    print(f"✅ Đã cắt thành {len(chunks)} đoạn nhỏ.")

    # 4. Tải Model Embeddings (LƯU Ý: Phải nhớ tên model này)
    print("⬇️ Đang tải Model Embeddings (HuggingFace)...")
    embedding_model = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")

    # 5. Tạo và Lưu Database
    print("🚀 Đang tạo Vector Database và lưu vào thư mục 'chroma_db'...")
    db = Chroma.from_documents(
        documents=chunks, 
        embedding=embedding_model, 
        persist_directory=DB_PATH
    )
    print("🎉 XONG! Thư mục 'chroma_db' đã sẵn sàng để đẩy lên GitHub.")

if __name__ == "__main__":
    create_vector_db()