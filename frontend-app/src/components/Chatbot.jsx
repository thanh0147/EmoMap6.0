import React, { useState, useRef, useEffect } from 'react';
// Import thêm icon Sách (FaBook) và icon Đóng (FaTimes)
import { FaCommentDots, FaTimes, FaPaperPlane, FaRobot, FaUserCircle, FaBookOpen } from 'react-icons/fa';
import './Chatbot.css';
import { ShieldAlert, PhoneCall } from 'lucide-react';
// --- THÊM MỚI: COMPONENT MODAL KHẨN CẤP ---
const EmergencyModal = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[9999999] flex items-center justify-center p-4">
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

const Chatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', content: 'Chào bạn! Mình là trợ lý ảo tâm lý học đường. Mình có thể giúp gì cho bạn?', sources: [] }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  // State mới: Lưu nội dung nguồn đang được xem (để hiện popup)
  const [activeSource, setActiveSource] = useState(null);
  const messagesEndRef = useRef(null);

  const toggleChat = () => setIsOpen(!isOpen);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input, sources: [] };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('https://thanhmc0147-backend-emo.hf.space/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage.content }),
      });

      const data = await response.json();
      // --- XỬ LÝ CẢNH BÁO NGUY HIỂM ---
      if (data.is_dangerous) {
        setShowEmergencyModal(true); // Bật Modal ngay lập tức
        if (!isOpen) setIsOpen(true); // Nếu chat đang đóng thì mở nó ra (tuỳ chọn)
      }
      // Ví dụ: Logic xử lý khi AI phát hiện nguy hiểm
      if (data.status === 'success') {
        setMessages((prev) => [...prev, { 
          role: 'bot', 
          content: data.reply,
          sources: data.sources || [] // Lưu nguồn vào tin nhắn
        }]);
      } else {
        setMessages((prev) => [...prev, { role: 'bot', content: 'Lỗi: ' + data.reply }]);
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'bot', content: 'Không thể kết nối Server.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') sendMessage();
  };

  const renderAvatar = (role) => (
    <div className={`avatar-container ${role === 'bot' ? 'bot-avatar' : 'user-avatar'}`}>
      {role === 'bot' ? <img src="kitty.png" alt="" /> : <img src="cat.png" alt="" /> }
    </div>
  );


  return (
    <div className="chatbot-wrapper">
      {/* --- PHẦN 1: MODAL CẢNH BÁO (Đặt ở ngoài cùng để đè lên tất cả) --- */}
      {showEmergencyModal && (
        <EmergencyModal onClose={() => setShowEmergencyModal(false)} />
      )}
      <div className={`chat-popup ${isOpen ? 'open' : ''}`}>
        
        {/* --- HEADER --- */}
        <div className="chat-header">
          <div className="header-info">
            <div className="cute-title">✨ Góc tâm lý học đường</div>
            
          </div>
          <button className="close-btn" onClick={toggleChat}><FaTimes /></button>
        </div>

        {/* --- MESSAGES --- */}
        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div key={index} className={`message ${msg.role}`}>
              {msg.role === 'bot' && renderAvatar('bot')}
              
              <div className="message-bubble-wrapper">
                <div className="message-content">
                  {msg.content}
                </div>
                
                {/* NÚT XEM NGUỒN (Chỉ hiện khi là Bot và có nguồn) */}
                {msg.role === 'bot' && msg.sources && msg.sources.length > 0 && (
                  <div className="source-tag" onClick={() => setActiveSource(msg.sources)}>
                    <FaBookOpen size={12} /> Nguồn tham khảo
                  </div>
                )}
              </div>

              {msg.role === 'user' && renderAvatar('user')}
            </div>
          ))}
          
          {isLoading && (
            <div className="message bot">
              {renderAvatar('bot')}
              <div className="message-content loading-dots"><span>.</span><span>.</span><span>.</span></div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* --- INPUT --- */}
        <div className="chat-input-area">
          <input type="text" placeholder="Nhập tin nhắn..." value={input} onChange={(e) => setInput(e.target.value)} onKeyPress={handleKeyPress} disabled={isLoading} />
          <button className="send-btn" onClick={sendMessage} disabled={isLoading || !input.trim()}><FaPaperPlane /></button>
        </div>

        {/* --- POPUP HIỂN THỊ NGUỒN (Đè lên chat) --- */}
        {activeSource && (
  <div className="source-overlay">
    <div className="source-content">
      <div className="source-header">
        <h4>📚 Tài liệu đã tham khảo</h4>
        <button onClick={() => setActiveSource(null)}><FaTimes /></button>
      </div>
      
      <div className="source-body">
        {activeSource.map((item, i) => (
          <div key={i} className="source-card">
            {/* Hiển thị Tên Tài Liệu (Tách riêng cho dễ nhìn) */}
            <div className="source-title">
              <FaBookOpen size={14} style={{marginRight: '5px', color: '#4a90e2'}}/>
              {/* Chỉ lấy tên file, bỏ đường dẫn dài dòng nếu có */}
              {item.source.split('/').pop()}
            </div>
            
            {/* Hiển thị Trích Dẫn Ngắn */}
            <div className="source-snippet">
              "{item.snippet}"
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
)}

      </div>

      <button className={`chat-toggle-btn ${isOpen ? 'open' : ''}`} onClick={toggleChat}>
        {isOpen ? <FaTimes size={24} /> : <FaCommentDots size={28} />}
      </button>
    </div>
  );
};

export default Chatbot;