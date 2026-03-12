export default function ReportView({ data, onClose }) {
  const parsedData = typeof data === 'string' ? JSON.parse(data.match(/\{[\s\S]*\}/)[0]) : data;

  return (
    <div className="bg-white rounded-3xl overflow-hidden flex flex-col h-[85vh] w-[90vw] max-w-[1000px] mx-auto shadow-2xl border border-gray-100">
      {/* 상단 바 */}
      <div className="bg-yellow-500 text-white p-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3 ml-2">
          <span className="text-lg">📝</span>
          <span className="text-[10px] font-bold tracking-widest uppercase opacity-90">Deep Analysis Report</span>
        </div>
        <button onClick={onClose} className="hover:bg-yellow-600 p-2 rounded-full transition-colors mr-1">✕</button>
      </div>

      {/* 보고서 본문 영역 */}
      <div className="flex-1 overflow-auto bg-gray-50 p-8 md:p-16 custom-scrollbar">
        <div className="bg-white shadow-sm border border-gray-200 rounded-lg p-10 md:p-20 min-h-full">
          {/* 보고서 헤더 */}
          <div className="border-b-2 border-gray-100 pb-8 mb-10">
            <h1 className="text-3xl font-black text-gray-900 mb-4 leading-tight">{parsedData.title}</h1>
            <p className="text-gray-500 text-sm italic">"{parsedData.summary}"</p>
            
            <div className="flex gap-2 mt-6">
              {parsedData.keywords?.map((kw, i) => (
                <span key={i} className="px-3 py-1 bg-yellow-50 text-yellow-700 text-[10px] font-bold rounded-full">
                  #{kw}
                </span>
              ))}
            </div>
          </div>

          {/* 섹션 반복 */}
          <div className="space-y-12">
            {parsedData.sections.map((section, idx) => (
              <div key={idx}>
                <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-3">
                  <span className="w-1.5 h-6 bg-yellow-400 rounded-full"></span>
                  {section.header}
                </h3>
                <p className="text-gray-600 leading-relaxed text-sm whitespace-pre-wrap">
                  {section.content}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-20 pt-10 border-t border-dashed border-gray-200 text-center">
            <p className="text-[10px] text-gray-400 uppercase tracking-widest">End of Report</p>
          </div>
        </div>
      </div>
    </div>
  );
}