import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle, X, BookOpen, FileText, Bookmark, PhoneCall, ShieldAlert } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// --- COMPONENT: MODAL HIỂN THỊ NGUỒN (POPUP) ---
const SourceModal = ({ sources, onClose }) => {
  if (!sources) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Lớp nền mờ (Backdrop) */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Hộp nội dung chính */}
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col relative z-10 animate-fade-in-up">
        
        {/* Header của Popup */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h3 className="text-lg font-bold text-indigo-700 flex items-center gap-2">
            <BookOpen size={20} /> Tài liệu tham khảo
          </h3>
          <button 
            onClick={onClose}
            className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Danh sách nguồn (Scrollable) */}
        <div className="overflow-y-auto p-5 space-y-4">
          {sources.map((src, idx) => (
            <div key={idx} className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 hover:shadow-md transition-all">
              
              {/* Tên file & Số trang */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
                  <FileText size={16} />
                  <span>{src.source}</span>
                </div>
                {src.page && src.page !== 'N/A' && (
                  <span className="flex items-center gap-1 text-[10px] bg-white border border-indigo-200 text-indigo-600 px-2 py-1 rounded-full font-bold shadow-sm whitespace-nowrap">
                    <Bookmark size={10} /> Trang {src.page}
                  </span>
                )}
              </div>

              {/* Đoạn trích dẫn */}
              <div className="bg-white p-3 rounded-lg border border-gray-100 text-sm text-gray-600 italic leading-relaxed relative">
                 <span className="absolute top-0 left-1 text-2xl text-indigo-200 font-serif">“</span>
                 {src.snippet}
                 <span className="absolute bottom-0 right-1 text-2xl text-indigo-200 font-serif leading-none">”</span>
              </div>
            </div>
          ))}
        </div>

        {/* Footer của Popup */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-3xl text-center">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};
// --- THÊM MỚI: COMPONENT MODAL KHẨN CẤP ---
const EmergencyModal = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Nền tối đen hơn bình thường để tập trung sự chú ý */}
      <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={onClose}></div>

      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 animate-bounce-short overflow-hidden border-2 border-red-100">
        
        {/* Header Đỏ */}
        <div className="bg-red-50 p-6 text-center border-b border-red-100">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
            <ShieldAlert size={32} className="text-red-600" />
          </div>
          <h3 className="text-xl font-extrabold text-red-600">CẢNH BÁO SOS</h3>
          <p className="text-sm text-red-400 mt-1 font-medium">Chúng mình nhận thấy bạn đang gặp nguy hiểm!</p>
        </div>

        {/* Nội dung hành động */}
        <div className="p-6 space-y-4">
          <p className="text-gray-600 text-center text-sm leading-relaxed">
            EmoMap luôn ở đây lắng nghe, nhưng trường hợp này cần sự hỗ trợ ngay lập tức từ người lớn. Hãy liên hệ ngay:
          </p>

          <a href="tel:111" className="block w-full bg-red-600 hover:bg-red-700 text-white p-4 rounded-xl flex items-center justify-center gap-3 transition-transform hover:scale-105 shadow-lg shadow-red-200">
            <PhoneCall size={24} />
            <div className="text-left">
              <span className="block text-xs opacity-90 uppercase font-bold">Tổng đài Quốc gia (Miễn phí)</span>
              <span className="block text-2xl font-bold">111</span>
            </div>
          </a>

          <button className="w-full bg-white border border-gray-200 text-gray-700 p-3 rounded-xl font-bold hover:bg-gray-50 transition-colors">
            📞 Gọi thầy cô tham vấn (098...)
          </button>
        </div>

        <div className="p-4 bg-gray-50 text-center border-t border-gray-100">
          <button onClick={onClose} className="text-gray-400 text-xs font-medium hover:text-gray-600 underline">
            Tôi đã an toàn, quay lại chat
          </button>
        </div>
      </div>
    </div>
  );
};
// --- COMPONENT CHÍNH: CHATBOT PAGE ---
const ChatbotPage = () => {
  const navigate = useNavigate();
  // State quản lý việc hiển thị Popup (lưu danh sách nguồn đang xem)
  const [activeSources, setActiveSources] = useState(null); 
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: 'Chào cậu! Mình là EmoMap - người bạn lắng nghe tâm hồn. Hôm nay cậu cảm thấy thế nào?',
      sources: [] // Tin chào hỏi không có nguồn
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: inputValue,
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      // Gọi API Backend
      const response = await fetch('https://focuses-worship-safe-cartoons.trycloudflare.com/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.text }),
      });
      const data = await response.json();
      if (data.is_dangerous) {
        setShowEmergencyModal(true); // -> BUNG POPUP NGAY
      }
      const aiMsg = {
        id: Date.now() + 1,
        sender: 'ai',
        text: data.reply,
        sources: data.sources || [] // Nhận nguồn từ backend
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1, sender: 'ai', text: "Kết nối lỗi, cậu thử lại nhé."
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-100 to-pink-100 flex flex-col items-center py-6 px-4">
      
      {/* 1. Header (Mèo Mascot) */}
      <div className="text-center mb-6 z-10">
        <div className="w-20 h-20 mx-auto bg-white rounded-full shadow-lg flex items-center justify-center mb-3 transform hover:scale-110 transition-transform cursor-pointer">
           <span className="text-4xl">🐱</span> 
        </div>
        <h1 className="text-3xl font-extrabold text-indigo-600 tracking-tight mb-1">EmoMap</h1>
        <p className="text-sm text-gray-500 font-medium">Người bạn lắng nghe tâm hồn Gen Z</p>
      </div>

      {/* 2. Khung Chat */}
      <div className="w-full max-w-2xl bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[65vh] border border-white/50 relative">
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              
              {msg.sender === 'ai' && (
                <div className="w-8 h-8 rounded-full bg-yellow-200 flex items-center justify-center mr-2 self-end mb-1 shadow-sm">🐱</div>
              )}

              <div className={`max-w-[85%] ${msg.sender === 'user' ? 'order-1' : 'order-2'}`}>
                <div 
                  className={`px-5 py-3 text-[15px] leading-relaxed shadow-sm ${
                    msg.sender === 'user' 
                      ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-none' 
                      : 'bg-white border border-gray-100 text-gray-700 rounded-2xl rounded-tl-none'
                  }`}
                >
                  <div className="whitespace-pre-line">{msg.text}</div>

                  {/* NÚT BẤM ĐỂ XEM NGUỒN (THAY VÌ HIỆN HẾT RA) */}
                  {msg.sources && msg.sources.length > 0 && (
                    <button 
                      onClick={() => setActiveSources(msg.sources)} // <--- Set state để mở Modal
                      className="mt-3 flex items-center gap-2 text-[11px] font-bold text-indigo-500 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors w-fit border border-indigo-100 group"
                    >
                      <BookOpen size={14} className="group-hover:scale-110 transition-transform" />
                      Xem {msg.sources.length} tài liệu tham khảo
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
               <div className="w-8 h-8 rounded-full bg-yellow-200 flex items-center justify-center mr-2 self-end mb-1">🐱</div>
               <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-75"></span>
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-150"></span>
                  </div>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 3. Input Area */}
        <div className="p-4 bg-white border-t border-gray-50">
          <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-2 bg-gray-100 rounded-full px-2 py-2 border border-transparent focus-within:border-indigo-300 focus-within:bg-white transition-all shadow-inner">
            <div className="pl-3 text-gray-400"><MessageCircle size={20} /></div>
            <input 
              type="text" 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Chia sẻ câu chuyện của cậu..." 
              className="flex-1 bg-transparent focus:outline-none text-gray-700 px-2"
            />
            <button disabled={!inputValue.trim()} className={`p-2 rounded-full transition-all ${inputValue.trim() ? 'bg-indigo-600 text-white shadow-lg' : 'bg-gray-300 text-gray-500'}`}>
              <Send size={18} />
            </button>
          </form>
        </div>

        {/* --- HIỂN THỊ MODAL NẾU activeSources KHÁC NULL --- */}
        {activeSources && (
          <SourceModal 
            sources={activeSources} 
            onClose={() => setActiveSources(null)} // Đóng Modal
          />
        )}

      </div>
      {/* Modal Khẩn cấp (Mới) */}
      {showEmergencyModal && (
        <EmergencyModal onClose={() => setShowEmergencyModal(false)} />
      )}
    </div>
  );
};

export default ChatbotPage;