import { useState, useEffect } from 'react';

export default function VideoOverview({ data, onClose }) {
  const [generatedVideos, setGeneratedVideos] = useState({});
  const [loadingScenes, setLoadingScenes] = useState({});
  const [parsedData, setParsedData] = useState(null);

  // 1. 전달받은 data가 문자열일 경우를 대비한 파싱 로직
  useEffect(() => {
    try {
      if (typeof data === 'string') {
        // JSON 추출 정규식 적용
        const jsonMatch = data.match(/\{[\s\S]*\}/);
        setParsedData(JSON.parse(jsonMatch ? jsonMatch[0] : data));
      } else {
        setParsedData(data);
      }
    } catch (e) {
      console.error("데이터 파싱 에러:", e);
    }
  }, [data]);

  // 데이터가 없거나 파싱 중일 때 로딩 표시
  if (!parsedData || !parsedData.scenes) {
    return (
      <div className="bg-white p-10 rounded-3xl text-center">
        <p className="text-gray-500">데이터를 불러오는 중이거나 형식이 잘못되었어.</p>
        <button onClick={onClose} className="mt-4 text-blue-500 font-bold">닫기</button>
      </div>
    );
  }

  const generateSceneVideo = async (scene) => {
    const sceneNum = scene.scene_number;
    setLoadingScenes(prev => ({ ...prev, [sceneNum]: true }));
    
    try {
      const response = await fetch('/api/video/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: scene.visual_prompt,
          sceneNumber: sceneNum
        }),
      });
      
      const result = await response.json();
      
      if (result.videoUrl) {
        setGeneratedVideos(prev => ({ ...prev, [sceneNum]: result.videoUrl }));
      } else {
        alert(`장면 ${sceneNum} 생성 실패: ${result.error || '오류 발생'}`);
      }
    } catch (error) {
      alert("네트워크 오류가 발생했어.");
    } finally {
      setLoadingScenes(prev => ({ ...prev, [sceneNum]: false }));
    }
  };

  return (
    <div className="bg-white rounded-3xl overflow-hidden flex flex-col h-[85vh] w-full shadow-2xl border border-gray-200">
      {/* 상단 바 */}
      <div className="bg-gray-900 text-white p-4 flex justify-between items-center shrink-0">
        <span className="text-[10px] font-bold tracking-widest opacity-60">AI VIDEO STORYBOARD</span>
        <button onClick={onClose} className="hover:bg-gray-800 p-2 rounded-full transition-colors">✕</button>
      </div>

      {/* 메인 콘텐츠 영역 */}
      <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black text-gray-900 mb-2">{parsedData.video_title || "동영상 개요"}</h2>
          <p className="text-gray-500 mb-10 text-sm">각 장면을 확인하고 Veo AI를 통해 영상을 생성해봐.</p>
          
          <div className="space-y-10">
            {parsedData.scenes.map((scene, idx) => (
              <div key={idx} className="grid grid-cols-1 lg:grid-cols-12 gap-8 bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-gray-100">
                
                {/* 왼쪽 설명 영역 (4/12) */}
                <div className="lg:col-span-5 space-y-5">
                  <div className="flex items-center gap-3">
                    <span className="bg-green-600 text-white text-[10px] font-black px-2.5 py-1 rounded-lg shadow-md shadow-green-100">
                      SCENE {scene.scene_number}
                    </span>
                    <span className="text-xs font-bold text-gray-400">{scene.duration || 5}s</span>
                  </div>
                  
                  <h3 className="text-xl font-extrabold text-gray-800 leading-tight">{scene.title}</h3>
                  
                  <div className="space-y-3">
                    <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      <span className="text-[10px] font-black text-gray-400 uppercase block mb-1">Visual Prompt</span>
                      <p className="text-xs text-gray-600 leading-relaxed italic">"{scene.visual_prompt}"</p>
                    </div>
                    
                    <div className="p-1">
                      <span className="text-[10px] font-black text-green-600 uppercase block mb-1">Narration</span>
                      <p className="text-sm text-gray-700 leading-relaxed">{scene.narration}</p>
                    </div>
                  </div>
                </div>

                {/* 오른쪽 영상 생성 영역 (7/12) */}
                <div className="lg:col-span-7 aspect-video bg-gray-100 rounded-[1.5rem] flex flex-col items-center justify-center relative overflow-hidden border border-gray-200 group">
                  {generatedVideos[scene.scene_number] ? (
                    <video 
                      src={generatedVideos[scene.scene_number]} 
                      controls 
                      loop 
                      className="w-full h-full object-cover shadow-inner"
                    />
                  ) : loadingScenes[scene.scene_number] ? (
                    <div className="text-center p-6">
                      <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-sm font-bold text-green-700 animate-pulse">Veo가 영상을 굽는 중...</p>
                    </div>
                  ) : (
                    <div className="text-center group-hover:scale-105 transition-transform duration-300">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg mx-auto mb-4 text-2xl">🎬</div>
                      <button 
                        onClick={() => generateSceneVideo(scene)}
                        className="px-6 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-100 text-sm"
                      >
                        영상 생성하기
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}