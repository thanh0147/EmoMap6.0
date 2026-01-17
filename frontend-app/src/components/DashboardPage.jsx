import React, { useEffect, useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, ReferenceLine 
} from 'recharts';
import { Users, Activity, AlertTriangle, FileText, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DashboardPage = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- STATE CHO PHÂN TRANG & SẮP XẾP ---
  const [page, setPage] = useState(0); // Trang hiện tại (bắt đầu từ 0)
  const pageSize = 8; // Số lượng cột hiển thị mỗi trang (để 8 cho thoáng)
  const [sortBy, setSortBy] = useState('default'); // 'default' | 'high_to_low'

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('https://focuses-worship-safe-cartoons.trycloudflare.com/api/dashboard');
        const data = await res.json();
        if (data.status === 'success') {
          setStats(data);
        }
      } catch (error) {
        console.error("Lỗi tải dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  // --- LOGIC XỬ LÝ DỮ LIỆU BIỂU ĐỒ ---
  const processedQuestions = useMemo(() => {
    if (!stats?.question_stats) return [];
    
    let data = [...stats.question_stats];

    // 1. Sắp xếp nếu cần
    if (sortBy === 'high_to_low') {
      data.sort((a, b) => b.avg - a.avg);
    } else {
      // Mặc định sắp xếp theo ID câu hỏi (tách số từ chuỗi "CQ12" để sort cho đúng)
      data.sort((a, b) => {
         const numA = parseInt(a.question.match(/\d+/)) || 0;
         const numB = parseInt(b.question.match(/\d+/)) || 0;
         return numA - numB;
      });
    }
    return data;
  }, [stats, sortBy]);

  // 2. Cắt dữ liệu theo trang (Pagination)
  const chartData = processedQuestions.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(processedQuestions.length / pageSize);

  // --- HÀM XÁC ĐỊNH MÀU SẮC CỘT ---
  // Giả sử thang điểm 1-5. Bạn có thể chỉnh ngưỡng này tùy ý.
  const getBarColor = (score) => {
    if (score >= 4.0) return "#EF4444"; // Đỏ: Rất nguy hiểm
    if (score >= 3.0) return "#F59E0B"; // Vàng: Cần chú ý
    return "#10B981";                   // Xanh: Ổn
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center">Đang tải dữ liệu...</div>;
  if (!stats) return <div className="text-center p-10">Không có dữ liệu.</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard Quản Trị</h1>
          <p className="text-gray-500">Tổng quan tình hình sức khỏe tâm lý học sinh</p>
        </div>
        <button onClick={() => navigate('/')} className="px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 font-medium">
          Về trang chủ
        </button>
      </div>

      {/* 1. Cards Thống kê (Giữ nguyên) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <StatCard icon={<Users className="text-blue-600"/>} title="Tổng số bài test" value={stats.total_users} bg="bg-blue-50"/>
        <StatCard icon={<Activity className="text-green-600"/>} title="Điểm trung bình" value={`${stats.avg_score}`} bg="bg-green-50"/>
        <StatCard icon={<AlertTriangle className="text-red-600"/>} title="Ca nguy hiểm" value={stats.risk_distribution.find(x => x.name === "Nguy hiểm")?.value || 0} bg="bg-red-50"/>
        <StatCard icon={<FileText className="text-purple-600"/>} title="Câu hỏi khảo sát" value={stats.question_stats.length} bg="bg-purple-50"/>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* --- 2. BIỂU ĐỒ CỘT (ĐÃ NÂNG CẤP) --- */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-700">Phân tích chi tiết từng câu hỏi</h3>
            
            {/* Bộ lọc sắp xếp */}
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400"/>
              <select 
                className="text-sm border-none bg-gray-100 rounded-md p-2 outline-none focus:ring-2 focus:ring-blue-200 cursor-pointer"
                value={sortBy}
                onChange={(e) => { setSortBy(e.target.value); setPage(0); }}
              >
                <option value="default">Theo thứ tự câu hỏi</option>
                <option value="high_to_low">Điểm cao nhất (Nguy hiểm)</option>
              </select>
            </div>
          </div>

          <div className="flex-grow h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis 
                  dataKey="question" 
                  angle={-15} 
                  textAnchor="end" 
                  interval={0} 
                  height={60} 
                  tick={{fontSize: 11, fill: '#6B7280'}}
                />
                <YAxis domain={[0, 5]} tickCount={6} />
                <Tooltip 
                  cursor={{ fill: '#f3f4f6' }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-lg max-w-xs">
                          <p className="font-bold text-gray-800 mb-1">{data.question}</p>
                          <p className="text-xs text-gray-500 mb-2 italic">{data.full_question}</p>
                          <div className="flex justify-between items-center border-t pt-2">
                            <span className="text-sm text-gray-600">Điểm TB:</span>
                            <span className="font-bold text-lg" style={{color: getBarColor(data.avg)}}>{data.avg}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine y={4} label="Nguy hiểm" stroke="red" strokeDasharray="3 3" />
                
                {/* Render các cột với màu sắc động */}
                <Bar dataKey="avg" radius={[6, 6, 0, 0]} barSize={40} animationDuration={800}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.avg)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Thanh điều hướng trang (Pagination Controls) */}
          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-50">
            <span className="text-sm text-gray-500">
              Hiển thị {page * pageSize + 1} - {Math.min((page + 1) * pageSize, processedQuestions.length)} trong số {processedQuestions.length} câu
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* 3. Biểu đồ Tròn (Giữ nguyên nhưng chỉnh UI một chút) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-center">
          <h3 className="text-lg font-bold text-gray-700 w-full mb-4">Tỷ lệ rủi ro tổng thể</h3>
          <div className="h-[250px] w-full">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.risk_distribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {stats.risk_distribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, "Số lượng"]} contentStyle={{borderRadius: '8px'}}/>
                </PieChart>
             </ResponsiveContainer>
          </div>
          
          {/* Custom Legend cho đẹp */}
          <div className="flex flex-col gap-3 w-full px-4 mt-2">
            {stats.risk_distribution.map((item, i) => (
              <div key={i} className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{backgroundColor: item.color}}></div>
                  <span className="text-gray-600">{item.name}</span>
                </div>
                <span className="font-bold text-gray-800">{item.value} học sinh</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Component Card nhỏ (Giữ nguyên)
const StatCard = ({ icon, title, value, bg }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-shadow">
    <div className={`p-4 rounded-xl ${bg}`}>
      {React.cloneElement(icon, { size: 24 })}
    </div>
    <div>
      <p className="text-sm text-gray-500 font-medium mb-1">{title}</p>
      <h4 className="text-2xl font-bold text-gray-800">{value}</h4>
    </div>
  </div>
);

export default DashboardPage;