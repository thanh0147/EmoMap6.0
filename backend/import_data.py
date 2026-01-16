import os
import pandas as pd
from supabase import create_client, Client

# --- CẤU HÌNH KẾT NỐI SUPABASE ---
# Lấy các thông tin này trong Supabase: Settings -> API
SUPABASE_URL = "https://rlbcntrphqnwlbceelbg.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJsYmNudHJwaHFud2xiY2VlbGJnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc3OTExMTIsImV4cCI6MjA4MzM2NzExMn0.jYHOkNSAq9Syhwvn0B0OgFoPX2ss_PdRdhXXNo7qWY0"

# Khởi tạo Client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def import_questions(file_path):
    print(f"🚀 Đang đọc dữ liệu từ file: {file_path}...")
    
    # 1. Đọc file Excel hoặc CSV bằng Pandas
    try:
        if file_path.endswith('.csv'):
            # Thêm engine='python' và sep=None để Python tự đoán dấu phân cách (; hay ,)
            # Thêm encoding='utf-8-sig' để đọc chuẩn tiếng Việt không bị lỗi font
            df = pd.read_csv(file_path, sep=None, engine='python', encoding='utf-8-sig')
        else:
            df = pd.read_excel(file_path)
    except FileNotFoundError:
        print("❌ Lỗi: Không tìm thấy file dữ liệu!")
        return
    except Exception as e:
        print(f"❌ Lỗi khi đọc file: {str(e)}")
        return

    # 2. Chuẩn hóa tên cột (Mapping)
    # Excel Header -> Database Column Name
    # Giúp khớp dữ liệu dù tên cột trong Excel viết hoa hay có dấu cách
    column_mapping = {
        "ID": "id",
        "Question_Content": "content",
        "Category": "category",
        "Weight": "weight"
    }
    
    # Kiểm tra xem file Excel có đủ cột không
    missing_cols = [col for col in column_mapping.keys() if col not in df.columns]
    if missing_cols:
        print(f"❌ File Excel thiếu các cột sau: {missing_cols}")
        print(f"   Các cột hiện có: {list(df.columns)}")
        return

    # Đổi tên cột cho khớp với Supabase Table
    df = df.rename(columns=column_mapping)
    
    # Chỉ lấy đúng 4 cột cần thiết
    df = df[["id", "content", "category", "weight"]]

    # 3. Chuyển đổi DataFrame thành List of Dictionaries (JSON format)
    # orient='records' sẽ tạo ra dạng: [{'id': 'Q01', ...}, {'id': 'Q02', ...}]
    data_to_insert = df.to_dict(orient='records')

    print(f"📦 Đã chuẩn bị {len(data_to_insert)} câu hỏi để upload.")

    # 4. Gửi dữ liệu lên Supabase
    try:
        # Dùng 'upsert' thay vì 'insert': Nếu ID đã tồn tại thì cập nhật, chưa có thì thêm mới.
        # Giúp bạn chạy script nhiều lần mà không bị lỗi "Duplicate Key".
        response = supabase.table('questions').upsert(data_to_insert).execute()
        
        # Kiểm tra kết quả (Supabase-py v2 trả về object, check thuộc tính data)
        # Lưu ý: Tùy version thư viện, cách check có thể khác nhau. 
        # Đoạn dưới đây in ra để debug.
        print("✅ Thành công! Dữ liệu đã được đẩy lên Supabase.")
        # print(response) # Bỏ comment nếu muốn xem log chi tiết
        
    except Exception as e:
        print(f"❌ Có lỗi xảy ra khi đẩy dữ liệu lên Server: {str(e)}")

# --- CHẠY CHƯƠNG TRÌNH ---
if __name__ == "__main__":
    # Thay tên file của bạn vào đây
    FILE_NAME = "question_matrix_v1.csv" 
    
    import_questions(FILE_NAME)