import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export default function SlideViewer({ data, onClose }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isExporting, setIsExporting] = useState(false); // 로딩 상태 추가
  const slide = data.slides[currentIdx];

  const exportToGoogleSlides = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/slides/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      
      if (result.url) {
        window.open(result.url, '_blank');
      } else {
        alert("내보내기 실패: " + (result.error || "알 수 없는 오류"));
      }
    } catch (error) {
      console.error("Export error:", error);
      alert("네트워크 오류가 발생했어.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl overflow-hidden flex flex-col h-[70vh] w-full shadow-2xl border border-gray-200">
      
      {/* 상단 컨트롤 바 */}
      <div className="bg-gray-900 text-white p-3 flex justify-between items-center shrink-0">
        <span className="text-[10px] font-bold tracking-widest opacity-60 ml-2">AI POWERED PRESENTATION</span>
        <button onClick={onClose} className="hover:bg-gray-800 p-1 rounded-full transition-colors mr-1">✕</button>
      </div>

      {/* 슬라이드 메인 영역 */}
      <div className="flex-1 bg-gray-50 p-4 flex items-center justify-center overflow-hidden">
        <div className="bg-white w-full h-full max-w-5xl shadow-lg rounded-xl flex flex-col overflow-hidden border border-gray-200">
          
          {/* 슬라이드 헤더 */}
          <div className="p-6 pb-2 shrink-0">
            <div className="flex items-center gap-3">
              <span className="bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded">P.{slide.page}</span>
              <h2 className="text-xl font-bold text-gray-900">{slide.title}</h2>
            </div>
            <div className="h-0.5 w-12 bg-indigo-600 mt-2 rounded-full"></div>
          </div>

          {/* 슬라이드 콘텐츠 영역 (스크롤 가능) */}
          <div className="flex-1 overflow-y-auto px-8 py-4 custom-scrollbar">
            {/* hasChart 값에 따라 그리드를 쓰거나 단일 컬럼을 씀 */}
            <div className={slide.hasChart && slide.chartData?.length > 0 ? "grid grid-cols-1 lg:grid-cols-2 gap-10" : "block"}>
              
              {/* 텍스트 콘텐츠 리스트 */}
              <div className="space-y-4">
                {slide.content.map((text, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-indigo-500 font-bold">•</span>
                    <p className="text-gray-700 text-sm leading-relaxed">{text}</p>
                  </div>
                ))}
              </div>

              {/* 시각화 데이터 영역: 데이터가 있을 때만 렌더링 */}
              {slide.hasChart && slide.chartData && slide.chartData.length > 0 && (
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 h-[250px] flex flex-col">
                  <span className="text-[10px] font-bold text-gray-400 mb-3 uppercase italic">Data Visualization</span>
                  <div className="flex-1 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      {slide.chartType === 'line' ? (
                        <LineChart data={slide.chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                          <XAxis dataKey="name" fontSize={10} tick={{fill: '#999'}} axisLine={false} tickLine={false} />
                          <YAxis fontSize={10} tick={{fill: '#999'}} axisLine={false} tickLine={false} />
                          <Tooltip contentStyle={{borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                          <Line type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4, fill: '#4f46e5' }} />
                        </LineChart>
                      ) : (
                        <BarChart data={slide.chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                          <XAxis dataKey="name" fontSize={10} tick={{fill: '#999'}} axisLine={false} tickLine={false} />
                          <YAxis fontSize={10} tick={{fill: '#999'}} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                          <Bar dataKey="value" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={30} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 하단 네비게이션 및 스크립트 */}
      <div className="bg-white border-t shrink-0">
        {/* 스크립트 영역: height 고정 대신 max-h와 overflow-y-auto 적용 */}
        <div className="px-6 py-3 bg-indigo-50/50 border-b flex gap-3 overflow-hidden">
          <span className="text-[9px] font-bold text-indigo-600 uppercase shrink-0 mt-1">Script</span>
          <div className="max-h-[80px] overflow-y-auto pr-2 custom-scrollbar flex-1">
            <p className="text-[11px] text-gray-600 leading-relaxed italic">
              "{slide.script}"
            </p>
          </div>
        </div>

        {/* 버튼 및 페이지 표시 영역 */}
        <div className="p-3 flex justify-between items-center px-6">
          <div className="flex items-center gap-4">
            <span className="text-xs font-bold text-gray-400">{currentIdx + 1} / {data.slides.length}</span>
            <button 
              onClick={exportToGoogleSlides}
              disabled={isExporting}
              className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg text-[10px] font-bold hover:bg-yellow-100 transition-all disabled:opacity-50 shadow-sm"
            >
              {isExporting ? "생성 중..." : " Google 슬라이드 저장"}
            </button>
          </div>
          
          <div className="flex gap-2">
            <button 
              disabled={currentIdx === 0}
              onClick={(e) => {
                e.stopPropagation(); // 클릭 신호가 부모(모달 닫기 로직)로 전달되는 것 방지
                setCurrentIdx(prev => prev - 1);
              }}
              className="px-3 py-1 text-xs font-bold border rounded-lg disabled:opacity-30 hover:bg-gray-50 transition-colors"
            >이전</button>
            <button 
              disabled={currentIdx === data.slides.length - 1}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIdx(prev => prev + 1);
              }}
              className="px-3 py-1 text-xs font-bold bg-indigo-600 text-white rounded-lg disabled:opacity-30 hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-100"
            >다음</button>
          </div>
        </div>
      </div>
    </div>
  );
}