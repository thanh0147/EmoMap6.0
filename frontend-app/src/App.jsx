import { React, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Chatbot from './components/Chatbot';
import ChatbotPage from './ChatbotPage'; // Nhớ import đúng đường dẫn
import { 
  Bot, User, ChevronRight, CheckCircle, 
  AlertTriangle, PhoneCall, RefreshCw, 
  ShieldCheck, BrainCircuit, HeartHandshake, Send,
  Heart, Phone, Home, MessageCircle, RefreshCcw
} from 'lucide-react';
import './App.css';

const API_URL = "https://focuses-worship-safe-cartoons.trycloudflare.com/api";
// --- COMPONENT 2: CHAT INTERFACE (Giao diện Chat - Đã sửa lỗi & Thêm Icon) ---
const ChatInterface = () => {
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  
  // BIẾN QUAN TRỌNG: Dùng để chặn React chạy 2 lần
  const hasInitialized = useRef(false);

  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [messages, setMessages] = useState([]); 
  const [isTyping, setIsTyping] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [isFinished, setIsFinished] = useState(false);

  // Auto scroll
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(scrollToBottom, [messages, isTyping]);

  // 1. Load câu hỏi (Đã thêm logic chặn lặp 2 lần)
  useEffect(() => {
    // Nếu đã chạy rồi thì dừng ngay (Fix lỗi lặp lời chào)
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initChat = async () => {
      setIsTyping(true);
      try {
        const res = await axios.get(`${API_URL}/questions`);
        setQuestions(res.data.data);
        
        // Logic timeline: Tắt typing -> Hiện lời chào -> Chờ 1s -> Hiện câu 1
        setTimeout(() => {
          setIsTyping(false);
          addBotMessage("Chào bạn! Mình là trợ lý AI. Mình sẽ hỏi bạn một vài câu hỏi ngắn để hiểu thêm về cảm xúc của bạn nhé. Đừng lo, mọi thứ đều bí mật! 🤫");
          
          // Chỉ hiện câu hỏi đầu tiên sau khi chào xong
          setTimeout(() => {
             // Lấy câu hỏi từ response trực tiếp để tránh delay của state
             if (res.data.data && res.data.data.length > 0) {
                 askQuestion(res.data.data[0].content);
             }
          }, 1500);
        }, 1000);

      } catch (err) {
        setIsTyping(false);
        addBotMessage("Ôi hỏng, mình bị mất kết nối với máy chủ rồi. Bạn kiểm tra lại backend nhé!");
      }
    };
    initChat();
  }, []);

  const addBotMessage = (text) => {
    setMessages(prev => [...prev, { type: 'bot', content: text }]);
  };

  const addUserMessage = (text) => {
    setMessages(prev => [...prev, { type: 'user', content: text }]);
  };

  // Hàm hỏi tách riêng, chỉ nhận nội dung text
  const askQuestion = (questionContent) => {
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addBotMessage(questionContent);
    }, 800);
  };

  const handleAnswer = (val, label, icon) => {
    if (isTyping || isFinished) return; 

    // 1. User trả lời (Hiện cả icon cho sinh động)
    addUserMessage(`${icon} ${label}`);

    // 2. Lưu đáp án
    const newAnswer = {
      question_id: questions[currentIndex].id,
      answer_value: val
    };
    const updatedAnswers = [...answers, newAnswer];
    setAnswers(updatedAnswers);

    // 3. Quyết định tiếp theo
    if (currentIndex < questions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      // Gọi câu hỏi tiếp theo từ mảng questions
      askQuestion(questions[nextIdx].content);
    } else {
      // Kết thúc
      setIsFinished(true);
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        addBotMessage("Cảm ơn bạn đã chia sẻ. Đợi mình phân tích một chút nhé...");
        setTimeout(() => submitTest(updatedAnswers), 2000);
      }, 1000);
    }
  };

  const submitTest = async (finalAnswers) => {
    try {
      const res = await axios.post(`${API_URL}/submit-test`, { answers: finalAnswers });
    
    // --- SỬA DÒNG NÀY ---
    // Thay vì: { state: { result: res.data.result } }
    // Hãy sửa thành:
      navigate('/result', { state: res.data.result });
    } catch (err) {
      addBotMessage("Lỗi khi chấm điểm. Vui lòng thử lại.");
    }
  };

  // DANH SÁCH NÚT BẤM KÈM ICON
  const answerOptions = [
    { val: 1, label: "Không bao giờ", icon: "😎", color: "bg-slate-100 hover:bg-slate-200 text-slate-600" },
    { val: 2, label: "Hiếm khi", icon: "🙂", color: "bg-blue-50 hover:bg-blue-100 text-blue-600" },
    { val: 3, label: "Thỉnh thoảng", icon: "😐", color: "bg-blue-100 hover:bg-blue-200 text-blue-700" },
    { val: 4, label: "Đôi khi", icon: "jq", color: "bg-indigo-100 hover:bg-indigo-200 text-indigo-700" }, // 'jq' là typo, sửa thành emoji bên dưới
    { val: 4, label: "Đôi khi", icon: "😟", color: "bg-indigo-100 hover:bg-indigo-200 text-indigo-700" },
    { val: 5, label: "Luôn luôn", icon: "😭", color: "bg-indigo-600 hover:bg-indigo-700 text-white" }
  ];

  return (
        
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4" id="khung" >
      <header className="page-header">
        <div className="header-content">
          <span className="icon-decoration left">🌸</span>
          <h1 className="main-title">Góc Tâm Lý Học Đường</h1>
          <span className="icon-decoration right">🌱</span>
        </div>
        <p className="sub-title">Nơi lắng nghe, thấu hiểu và chia sẻ mọi tâm tư của bạn</p>
      </header>
      <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col h-[75vh]">

        {/* Header */}
        <div className="bg-white border-b p-4 flex items-center gap-4 shadow-sm z-10">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <img src="763755.png" alt="" width="100%" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-lg">Trợ lý Tâm lý</h3>
            <div className="flex items-center gap-1 text-xs text-green-500 font-medium">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span> Online
            </div>
          </div>
        </div>

        {/* Chat Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50 scroll-smooth">
          {messages.map((msg, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              className={`flex w-full ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex max-w-[85%] gap-3 ${msg.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                
                {/* Avatar */}
                <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm ${
                  msg.type === 'user' ? 'bg-indigo-500' : 'bg-white border border-slate-200'
                } text-white`}>
                  {msg.type === 'user' ? <img src="kitty.png" alt="" width="100%" /> : <img src="763755.png" alt="" width="100%" />}
                </div>

                {/* Bong bóng chat */}
                <div className={`p-4 rounded-2xl text-[15px] leading-relaxed shadow-sm ${
                  msg.type === 'user' 
                    ? 'bg-indigo-500 text-white rounded-tr-none' 
                    : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            </motion.div>
          ))}

          {/* Typing Animation */}
          {isTyping && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex justify-start w-full"
            >
              <div className="flex items-center gap-3">
                 <div className="w-9 h-9 bg-white border border-slate-200 rounded-full flex items-center justify-center text-blue-600">
                    <Bot size={18}/>
                 </div>
                 <div className="bg-white border border-slate-100 p-4 rounded-2xl rounded-tl-none flex gap-1.5 shadow-sm items-center h-12">
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></span>
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></span>
                 </div>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Footer Actions (Sửa lại style nút bấm) */}
        <div className="p-4 bg-white border-t">
          {/* Chỉ hiện nút khi không phải đang typing và chưa kết thúc */}
          {!isFinished && !isTyping && messages.length > 0 && (
             <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-5 gap-2"
             >
              {[
                { val: 1, label: "K.Bao giờ", fullLabel: "Không bao giờ", icon: "😎", color: "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200" },
                { val: 2, label: "Hiếm khi", fullLabel: "Hiếm khi", icon: "🙂", color: "bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-100" },
                { val: 3, label: "Thỉnh thoảng", fullLabel: "Thỉnh thoảng", icon: "😐", color: "bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200" },
                { val: 4, label: "Đôi khi", fullLabel: "Đôi khi", icon: "😟", color: "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200" },
                { val: 5, label: "Luôn luôn", fullLabel: "Luôn luôn", icon: "😭", color: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200" }
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => handleAnswer(opt.val, opt.fullLabel, opt.icon)}
                  className={`${opt.color} py-2 rounded-xl transition-all active:scale-95 flex flex-col items-center justify-center h-20 md:h-24 group`}
                >
                  <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">{opt.icon}</span>
                  <span className="text-[10px] md:text-xs font-bold text-center leading-tight px-1">{opt.label}</span>
                </button>
              ))}
            </motion.div>
          )}
          
          {(isTyping || isFinished) && (
            <p className="text-center text-slate-400 text-sm italic py-4">
              {isFinished ? "Đang xử lý kết quả..." : "Trợ lý đang nhập..."}
            </p>
          )}
        </div>

      </div>
    </div>
  );
};
// --- COMPONENT 3: RESULT PAGE (Trang kết quả) ---
import { useLocation } from 'react-router-dom';
import LandingPage from './LandingPage';

const ResultPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // Lấy điểm từ trang trước (mặc định 0 nếu không có)
  const score = location.state?.score || 0; 
  const total = 100;

  // --- HÀM CẤU HÌNH GIAO DIỆN THEO ĐIỂM SỐ ---
  const getResultConfig = (score) => {
    if (score >= 65) {
      return {
        theme: "rose", // Tông màu chủ đạo
        icon: <Heart className="w-16 h-16 text-rose-500 fill-current animate" />,
        title: "Bạn đang chịu nhiều áp lực",
        message: "Có vẻ như bạn đang trải qua một giai đoạn khó khăn. Đừng giữ trong lòng một mình, việc chia sẻ cảm xúc là bước đầu tiên để thấy nhẹ lòng hơn.",
        advice: "Hãy thử hít thở sâu, nghe một bản nhạc nhẹ, hoặc trò chuyện với trợ lý ảo của chúng mình nhé.",
        bgColor: "bg-rose-50",
        btnColor: "bg-rose-500 hover:bg-rose-600",
        textColor: "text-rose-600"
      };
    } else if (score >= 30) {
      return {
        theme: "orange",
        icon: <MessageCircle className="w-16 h-16 text-orange-500" />,
        title: "Cần chút cân bằng lại",
        message: "Tâm trạng của bạn đang ở mức trung bình. Có chút lo âu nhưng vẫn trong tầm kiểm soát. Hãy dành thời gian chăm sóc bản thân nhiều hơn.",
        advice: "Một giấc ngủ ngon hoặc một buổi đi dạo sẽ giúp bạn thấy tốt hơn rất nhiều.",
        bgColor: "bg-orange-50",
        btnColor: "bg-orange-500 hover:bg-orange-600",
        textColor: "text-orange-600"
      };
    } else {
      return {
        theme: "green",
        icon: <div className="text-6xl">🌿</div>,
        title: "Tâm trạng tích cực",
        message: "Tuyệt vời! Bạn đang có trạng thái tinh thần khá tốt và ổn định. Hãy duy trì những thói quen tích cực này nhé.",
        advice: "Hãy lan tỏa năng lượng tích cực này đến bạn bè xung quanh nhé!",
        bgColor: "bg-green-50",
        btnColor: "bg-green-500 hover:bg-green-600",
        textColor: "text-green-600"
      };
    }
  };

  const config = getResultConfig(score);

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${config.bgColor} transition-colors duration-500`}>
      <div className="bg-white max-w-lg w-full rounded-3xl shadow-xl overflow-hidden transform transition-all hover:scale-[1.01]">
        
        {/* Header trang trí */}
        <div className={`h-32 ${config.btnColor} relative flex justify-center items-end`}>
           <div className="absolute -bottom-10 bg-white p-4 rounded-full shadow-lg border-4 border-white">
              {config.icon}
           </div>
        </div>

        <div className="pt-14 pb-8 px-8 text-center">
          {/* Điểm số hiển thị nhẹ nhàng */}
          <h2 className={`text-2xl font-bold ${config.textColor} mb-2`}>
            {config.title}
          </h2>
          
          <div className="mb-6">
            <span className="text-5xl font-extrabold text-gray-800">{score}</span>
            <span className="text-gray-400 text-xl">/{total}</span>
            <p className="text-sm text-gray-400 mt-1 uppercase tracking-wider font-semibold">Mức độ căng thẳng</p>
          </div>

          {/* Lời khuyên ân cần */}
          <div className="bg-gray-50 rounded-xl p-5 mb-6 text-left border border-gray-100">
             <p className="text-gray-700 mb-3 leading-relaxed">
               {config.message}
             </p>
             <div className={`text-sm font-medium ${config.textColor} flex items-start gap-2`}>
               <span>💡</span> 
               <span>{config.advice}</span>
             </div>
          </div>

          {/* Khu vực Hotline (Chỉ hiện khi điểm cao) - Thiết kế mềm mại hơn */}
          {score >= 65 && (
            <div className="mb-6 bg-rose-100/50 rounded-xl p-4 flex items-center justify-between border border-rose-100">
               <div className="text-left pl-2">
                 <p className="text-xs text-rose-600 font-bold uppercase">Hỗ trợ khẩn cấp 24/7</p>
                 <p className="text-sm text-gray-600">Tổng đài quốc gia bảo vệ trẻ em</p>
               </div>
               <a href="tel:111" className="flex items-center gap-2 bg-white text-rose-600 px-4 py-2 rounded-full font-bold shadow-sm hover:shadow-md transition-all">
                 <Phone size={18} fill="currentColor" />
                 111
               </a>
            </div>
          )}

          {/* Các nút hành động */}
          <div className="grid grid-cols-2 gap-3">
             {/* Nút Chat ngay - Quan trọng nhất */}
             <button 
               onClick={() => navigate('/ChatbotPage')} // Giả sử đường dẫn chat là /chat
               className={`col-span-2 py-3 rounded-xl text-white font-semibold shadow-md flex items-center justify-center gap-2 ${config.btnColor} transition-transform active:scale-95`}
             >
               <MessageCircle size={20} />
               Tâm sự với Trợ lý ảo ngay
             </button>

             <button 
               onClick={() => navigate('/')} 
               className="py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
             >
               <Home size={18} />
               Về trang chủ
             </button>

             <button 
               onClick={() => navigate('/test')} 
               className="py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 flex items-center justify-center gap-2"
             >
               <RefreshCcw size={18} />
               Làm lại
             </button>
          </div>
          
        </div>
      </div>
    </div>
  );
};

import DashboardPage from './components/DashboardPage';
// --- APP NAVIGATION ---
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage/>} />
        <Route path="/ChatbotPage" element={<ChatbotPage/>} />
        <Route path="/test" element={<ChatInterface />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
      
      <Chatbot />
    </BrowserRouter>
  );
  
}