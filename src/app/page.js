'use client';

import { useState, useRef, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL, listAll, getMetadata, deleteObject } from "firebase/storage"; // 여기서 추가
import { collection, addDoc, serverTimestamp, query, orderBy, getDocs, limit, deleteDoc, doc } from "firebase/firestore";
import { storage } from "@/lib/firebase";
import { db } from "@/lib/firebase";
import QuizCard from './components/QuizCard';
import Flashcard from './components/Flashcard';
import AudioOverview from './components/AudioOverview';
import SlideViewer from './components/SlideViewer';
import MindmapView from './components/MindmapView';
import ReportView from './components/ReportView';

export default function NotebookLM() {
  // 페이지가 처음 열릴 때 실행
  useEffect(() => {
    const initData = async () => {
      try {
        // 소스 불러오기
        const listRef = ref(storage, 'sources/');
        const res = await listAll(listRef);
        const fetchedSources = await Promise.all(
          res.items.map(async (itemRef) => {
            const url = await getDownloadURL(itemRef);
            const metadata = await getMetadata(itemRef);
            return { name: itemRef.name, selected: true, url, type: metadata.contentType };
          })
        );
        setSources(fetchedSources);

        // 노트 불러오기 (최신순)
        const notesQ = query(collection(db, "notes"), orderBy("createdAt", "desc"));
        const notesSnap = await getDocs(notesQ);
        setNotes(notesSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          date: doc.data().createdAt?.toDate().toLocaleTimeString() || ''
        })));

        // 이전 대화 불러오기
        const chatsQ = query(collection(db, "chats"), orderBy("createdAt", "asc"), limit(50));
        const chatsSnap = await getDocs(chatsQ);
        if (!chatsSnap.empty) {
          const history = chatsSnap.docs.map(doc => ({
            id: doc.id,
            role: doc.data().role,
            content: doc.data().content
          }));
          setMessages(prev => [prev[0], ...history]);
        }
      } catch (error) {
        console.error("데이터 로딩 실패:", error);
      }
    };
    initData();
  }, []);

  const [messages, setMessages] = useState([
    { role: 'assistant', content: '소스 파일을 분석하고 스튜디오에서 학습 자료를 생성해 보세요.' }
  ]);
  const [input, setInput] = useState('');
  const [sources, setSources] = useState([]);
  const [notes, setNotes] = useState([]);
  const fileInputRef = useRef(null);
  const [studioHeight, setStudioHeight] = useState(320); // 초기 스튜디오 높이
  const [rightSidebarWidth, setRightSidebarWidth] = useState(400); // 좌우 너비
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // 사이드바 열림/닫힘
  const [selectedFileData, setSelectedFileData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedNote, setSelectedNote] = useState(null);
  const [isEditMode, setIsEditMode] = useState(false); // 편집 모드 여부
  const [selectedChatIds, setSelectedChatIds] = useState([]); // 선택된 대화 ID들
  
  const isResizingY = useRef(false);
  const isResizingX = useRef(false);

  // 마우스 이동 시 높이 계산
  const handleMouseMoveY = (e) => {
    if (!isResizingY.current) return;
    const newHeight = Math.max(150, Math.min(600, e.clientY - 0)); 
    setStudioHeight(newHeight);
  };

  const startResizingY = (e) => {
    isResizingY.current = true;
    document.addEventListener('mousemove', handleMouseMoveY);
    document.addEventListener('mouseup', stopResizingY);
    document.body.style.cursor = 'row-resize'; // 커서 변경
  };

  // 드래그 종료
  const stopResizingY = () => {
    isResizingY.current = false;
    document.removeEventListener('mousemove', handleMouseMoveY);
    document.removeEventListener('mouseup', stopResizingY);
    document.body.style.cursor = 'default';
  };

  // 스튜디오 메뉴 아이템 데이터
  const studioItems = [
    { name: 'AI 오디오 오버뷰', icon: '🎧', color: 'bg-purple-50 text-purple-700' },
    { name: '동영상 개요', icon: '🎬', color: 'bg-green-50 text-green-700' },
    { name: '마인드맵', icon: '🧠', color: 'bg-pink-50 text-pink-700' },
    { name: '보고서', icon: '📝', color: 'bg-yellow-50 text-yellow-700' },
    { name: '플래시카드', icon: '🎴', color: 'bg-orange-50 text-orange-700' },
    { name: '퀴즈', icon: '❓', color: 'bg-blue-50 text-blue-700' },
    { name: '슬라이드', icon: '📊', color: 'bg-indigo-50 text-indigo-700' },
  ];

  // 소스 추가 함수
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const isDuplicate = sources.some(src => src.name === file.name);
    if (isDuplicate) {
      alert(`"${file.name}" 파일은 이미 소스에 추가되어 있어!`);
      e.target.value = ''; // 입력창 초기화
      return;
    }

    try {
      const storageRef = ref(storage, `sources/${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      setSources(prev => [...prev, { name: file.name, selected: true, url, type: file.type }]);
      e.target.value = '';
    } catch (error) {
      console.error("업로드 실패:", error);
    }
  };
  
  const removeSource = async (index, fileName) => {
    try {
      const fileRef = ref(storage, `sources/${fileName}`);
      await deleteObject(fileRef);
      setSources(prev => prev.filter((_, i) => i !== index));
    } catch (error) {
      console.error("파일 삭제 오류:", error);
    }
  };

  // 체크박스 토글 함수
  const toggleSource = (index) => {
    setSources(prev => prev.map((src, i) => 
      i === index ? { ...src, selected: !src.selected } : src
    ));
  };

  const saveToNote = async (content, mode = 'note') => {
    if (!content || isSaving) return;
    setIsSaving(true);
    try {
      const docRef = await addDoc(collection(db, "notes"), {
        body: content,
        type: mode, // 퀴즈, 플래시카드 등 타입 저장
        createdAt: serverTimestamp(),
      });

      const newNote = { 
        id: docRef.id, 
        body: content,
        type: mode,
        date: new Date().toLocaleTimeString() 
      };
      setNotes(prev => [newNote, ...prev]);
    } catch (e) {
      console.error("노트 저장 에러:", e);
    } finally {
      setIsSaving(false);
    }
  };

  // Vertex
  // Vertex AI 호출 및 대화 저장 처리
  const handleSend = async (mode = 'chat') => {
    if (!input.trim() || isSaving) return;
    
    const userContent = input; 
    // 임시 ID를 사용
    const tempId = `temp-${Date.now()}`;
    const userMsg = { role: 'user', content: userContent, id: tempId };
    
    // 화면에 사용자 메시지 즉시 표시
    setMessages(prev => [...prev, userMsg]);
    const currentMessages = [...messages, userMsg]; // AI에게 보낼 최신 대화 배열
    
    setInput('');
    setIsSaving(true);

    try {
      // 유저 메시지 DB 저장 및 실제 ID 획득
      const userDocRef = await addDoc(collection(db, "chats"), {
        role: 'user',
        content: userContent,
        createdAt: serverTimestamp(),
        mode: mode
      });

      // 임시 ID를 실제 DB ID로 교체
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: userDocRef.id } : m));

      // Vertex AI 서버 호출 (currentMessages 사용)
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: currentMessages, 
          selectedSources: sources
            .filter(s => s.selected)
            .map(s => ({ name: s.name, url: s.url, type: s.type })),
          mode: mode
        }),
      });

      const data = await response.json();

      if (!data || !data.content) {
        throw new Error("AI 응답 데이터가 올바르지 않습니다.");
      }

      // AI 응답 DB 저장
      const aiDocRef = await addDoc(collection(db, "chats"), {
        role: 'assistant',
        content: data.content,
        createdAt: serverTimestamp(),
        mode: mode
      });

      // AI 메시지를 실제 ID와 함께 상태에 추가
      const finalAiMsg = { role: 'assistant', content: data.content, id: aiDocRef.id };
      setMessages(prev => [...prev, finalAiMsg]);

    } catch (error) {
      console.error('전송 중 오류:', error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `오류가 발생했습니다: ${error.message}`,
        id: `error-${Date.now()}` // 에러 메시지도 선택 가능하게 ID 부여
      }]);
    } finally {
      setIsSaving(false);
    }
  };

  // OpenAI
  /*const handleSend = async () => {
    if (!input.trim() || isSaving) return;
    
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsSaving(true);

    try {
      // 대화 저장 (사용자)
      await addDoc(collection(db, "chats"), {
        ...userMsg,
        createdAt: serverTimestamp()
      });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: [...messages, userMsg],
          selectedSources: sources.filter(s => s.selected).map(s => s.name) 
        }),
      });

      const aiMsg = await response.json();
      setMessages(prev => [...prev, aiMsg]);

      // 대화 저장 (AI)
      await addDoc(collection(db, "chats"), {
        ...aiMsg,
        createdAt: serverTimestamp()
      });

    } catch (error) {
      console.error('채팅 처리 중 오류:', error);
    } finally {
      setIsSaving(false);
    }
  };*/

  // 좌우 조절 (X축)
  const startResizingX = (e) => {
    isResizingX.current = true;
    document.addEventListener('mousemove', handleMouseMoveX);
    document.addEventListener('mouseup', stopResizingX);
    document.body.style.cursor = 'col-resize';
  };

  const handleMouseMoveX = (e) => {
    if (!isResizingX.current) return;
    // 오른쪽에서부터의 거리 계산
    const newWidth = window.innerWidth - e.clientX;
    setRightSidebarWidth(Math.max(250, Math.min(600, newWidth)));
  };

  const stopResizingX = () => {
    isResizingY.current = false;
    isResizingX.current = false;
    document.removeEventListener('mousemove', handleMouseMoveY);
    document.removeEventListener('mousemove', handleMouseMoveX);
    document.removeEventListener('mouseup', stopResizingX);
    document.body.style.cursor = 'default';
  };

  const runStudioFeature = async (mode) => {
    // 1. 선택된 소스 체크
    const selectedSources = sources.filter(s => s.selected);
    if (selectedSources.length === 0) {
      alert("분석할 소스 파일을 먼저 선택해줘!");
      return;
    }

    setIsSaving(true);

    // 2. 모드별 상세 지시사항(프롬프트) 설정
    let systemPrompt = "";
    if (mode === 'AI 오디오 오버뷰') {
      systemPrompt = `소스 내용을 바탕으로 두 명의 진행자가 대화하는 팟캐스트 대본을 작성해줘. 
      반드시 아래 JSON 형식으로만 답변하고, 앞뒤에 인사말이나 설명을 절대 붙이지 마:
      {
        "title": "주제 요약 팟캐스트",
        "scripts": [
          { "speaker": "진행자 A", "content": "내용" },
          { "speaker": "진행자 B", "content": "내용" }
        ]
      }`;
    } else if (mode === '슬라이드') {
        systemPrompt = `소스 내용을 분석하여 데이터 시각화가 포함된 PPT 구성안을 작성해줘. 
        
        [중요 지침]
        1. 한 슬라이드에 텍스트가 너무 많아지면(불렛포인트 4~5개 이상), 내용을 무리하게 채우지 말고 다음 페이지(Slide)로 나누어 작성해줘.
        2. 수치 데이터가 있다면 반드시 "chartData" 배열에 포함시켜줘.
        3. 데이터가 없는 슬라이드는 "hasChart": false로 설정해.

        반드시 아래 JSON 형식으로만 답변해:
        {
          "title": "전체 발표 주제",
          "slides": [
            { 
              "page": 1, 
              "title": "슬라이드 제목", 
              "content": ["핵심 포인트 1", "핵심 포인트 2"], 
              "hasChart": true,
              "chartType": "bar",
              "chartData": [
                { "name": "항목1", "value": 100 }
              ],
              "script": "발표용 스크립트"
            }
          ]
        }`;
      }else if (mode === '동영상 개요') {
        systemPrompt = `소스 내용을 바탕으로 슬라이드 쇼 형태의 홍보/설명 동영상 기획안을 작성해줘.
        
        [중요 지침]
        1. 각 장면(Scene)은 소스의 핵심 데이터를 시각적으로 표현해야 해.
        2. "visual_prompt"는 Google Veo 모델이 고화질 영상을 생성할 수 있도록, 카메라 앵글, 조명, 스타일, 움직임을 포함한 구체적인 **영문(English)**으로 작성해줘. (예: "Cinematic wide shot of a futuristic data center with blue LED lights, slow camera pan, 4k resolution")
        3. 데이터가 있다면 시각화 요소(차트, 그래프)를 영상에 포함하도록 묘사해.

        반드시 아래 JSON 형식으로 답변해:
        {
          "video_title": "동영상 제목",
          "scenes": [
            {
              "scene_number": 1,
              "title": "장면 제목",
              "visual_prompt": "Concrete, detailed English description for Veo model",
              "narration": "이 장면의 나레이션",
              "duration": 5
            }
          ]
        }`;
      } else if (mode === '마인드맵') {
        systemPrompt = `소스 내용을 분석하여 중심 주제로부터 가지가 뻗어나가는 마인드맵 구조를 작성해줘. 
        반드시 아래 JSON 형식으로만 답변해:
        {
          "title": "마인드맵 중심 주제",
          "nodes": [
            { "id": "root", "text": "중심 주제" },
            { "id": "branch1", "text": "상위 노드 1", "parent": "root" },
            { "id": "sub1", "text": "하위 노드 1-1", "parent": "branch1" }
          ]
        }`;
      } else if (mode === '보고서') {
        systemPrompt = `소스 내용을 바탕으로 전문적인 심층 분석 보고서를 작성해줘. 
        반드시 아래 JSON 형식으로만 답변해:
        {
          "title": "보고서 제목",
          "summary": "한 줄 요약",
          "sections": [
            { "header": "1. 서론", "content": "분석 배경 및 목적..." },
            { "header": "2. 핵심 분석", "content": "구체적인 데이터 및 내용..." },
            { "header": "3. 시사점 및 결론", "content": "종합적인 결과 및 제언..." }
          ],
          "keywords": ["키워드1", "키워드2"]
        }`;
      } else if (mode === '퀴즈' || mode === '플래시카드') {
          systemPrompt = `소스 내용을 분석해서 ${mode} 데이터만 JSON 형식으로 생성해줘. 텍스트 설명은 하지 마.`;
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          // AI에게 상세한 미션을 전달
          messages: [{ 
            role: 'user', 
            content: `${mode} 생성을 시작해줘. 지침: ${systemPrompt}` 
          }],
          selectedSources: selectedSources.map(s => ({ 
            name: s.name, url: s.url, type: s.type 
          })),
          mode: mode 
        }),
      });

      const data = await response.json();
      
      if (data.content) {
        // 3. JSON만 추출
        const jsonMatch = data.content.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
          const cleanContent = jsonMatch[0];
          // 4. 추출된 JSON이 올바른지 최종 확인 후 저장
          await saveToNote(cleanContent, mode);
        } else {
          // JSON 형식이 아예 없는 경우 (그냥 설명만 한 경우)
          console.error("AI가 형식을 지키지 않았어:", data.content);
          alert("AI가 대본 형식을 생성하지 못했어. 다시 한 번 눌러줘!");
        }
      }
    } catch (error) {
      console.error(`${mode} 생성 중 오류:`, error);
      alert("오류가 발생했어. 네트워크 상태를 확인해줘.");
    } finally {
      setIsSaving(false);
    }
  };

  const removeNote = async (id, e) => {
    e.stopPropagation(); // 모달이 뜨는 것을 방지
    if (!confirm("이 노트를 삭제할까요?")) return;
    try {
      await deleteDoc(doc(db, "notes", id));
      setNotes(prev => prev.filter(note => note.id !== id));
    } catch (error) {
      console.error("노트 삭제 실패:", error);
    }
  };

  // 전체 선택/해제 토글
  const toggleSelectAll = () => {
    if (selectedChatIds.length === messages.filter(m => m.id).length) {
      setSelectedChatIds([]);
    } else {
      // DB에 저장된 ID가 있는 메시지만 추출해서 전체 선택
      const allIds = messages.map(m => m.id).filter(id => id !== undefined);
      setSelectedChatIds(allIds);
    }
  };

  // 개별 선택 토글
  const toggleSelectChat = (id) => {
    setSelectedChatIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // 선택된 대화 삭제 실행
  const deleteSelectedChats = async () => {
    // 1. 선택된 ID가 없거나 배열이 아니면 종료
    if (!selectedChatIds || selectedChatIds.length === 0) return;
    if (!confirm(`${selectedChatIds.length}개의 대화를 삭제할까?`)) return;

    try {
      // 2. Firestore에서 실제 삭제 실행
      const deleteOps = selectedChatIds.map(async (chatId) => {
        // ID가 비어있거나 임시 ID(temp-)인 경우 DB 삭제 생략
        if (!chatId || String(chatId).startsWith('temp-')) return;
        
        // doc(db, "컬렉션이름", 문서ID) 형식이 정확해야 함
        const docRef = doc(db, "chats", chatId);
        return await deleteDoc(docRef);
      });
      
      await Promise.all(deleteOps);
      
      // 3. UI 업데이트
      setMessages(prev => prev.filter(m => {
        // 메시지에 ID가 없으면 일단 유지, ID가 있으면 선택된 목록에 없는 것만 남김
        if (!m.id) return true;
        return !selectedChatIds.includes(m.id);
      }));
      
      // 4. 상태 초기화
      setSelectedChatIds([]);
      setIsEditMode(false);
      
    } catch (error) {
      console.error("대화 삭제 실패:", error);
      alert("삭제 중 문제가 생겼어. 콘솔을 확인해봐.");
    }
  };

  return (
    <div className="flex h-screen bg-[#f8f9fa] text-gray-800 font-sans overflow-hidden">
      
      {/* 1. 왼쪽: 소스 사이드바 */}
      <aside className="w-64 bg-white border-r flex flex-col p-5">
        <div className="flex-1 overflow-y-auto">
          <h3 className="text-[11px] font-bold text-gray-400 uppercase mb-4 tracking-tighter">소스</h3>
          
          <div className="space-y-2 text-xs">
            {/* 소스 목록 렌더링 부분 */}
            {sources.map((src, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg border group">
                <input 
                  type="checkbox" 
                  checked={src.selected} 
                  onChange={() => toggleSource(i)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span className={`truncate flex-1 ${src.selected ? 'text-gray-800' : 'text-gray-400'}`}>
                  📄 {src.name}
                </span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation(); // 체크박스 이벤트와 겹치지 않게 방지
                    removeSource(i, src.name);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 rounded text-red-400 transition-opacity"
                  title="삭제"
                >
                  X
                </button>
              </div>
            ))}

            {/* 소스 추가 버튼 */}
            <button 
              onClick={() => fileInputRef.current.click()} 
              className="w-full py-2 border border-dashed rounded-lg text-gray-400 hover:bg-blue-50 transition-colors"
            >
              + 추가
            </button>

            {/* 숨겨진 파일 입력 필드 */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              className="hidden" 
            />
          </div>
        </div>
      </aside>

      {/* 2. 중앙 채팅 영역 */}
      <main className="flex-1 flex flex-col bg-white relative min-w-[400px]">
        <header className="h-14 border-b flex items-center justify-between px-6 shrink-0 bg-white z-10">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-500">대화</span>
            {isEditMode && (
              <button onClick={toggleSelectAll} className="text-[11px] text-blue-600 font-bold hover:underline">
                {selectedChatIds.length === messages.filter(m => m.id).length ? "전체 해제" : "전체 선택"}
              </button>
            )}
          </div>
          
          <div className="flex gap-3">
            {isEditMode ? (
              <>
                <button onClick={deleteSelectedChats} className="text-[11px] text-red-500 font-bold disabled:opacity-30" disabled={selectedChatIds.length === 0}>
                  {selectedChatIds.length}개 삭제
                </button>
                <button onClick={() => { setIsEditMode(false); setSelectedChatIds([]); }} className="text-[11px] text-gray-400">취소</button>
              </>
            ) : (
              <button onClick={() => setIsEditMode(true)} className="text-[11px] text-gray-400 hover:text-blue-500">편집</button>
            )}
          </div>
          {/* 사이드바 토글 버튼 */}
          {!isSidebarOpen && (
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg text-blue-600 font-bold text-sm"
            >
              스튜디오 열기 ◀
            </button>
          )}
        </header>
        
        {/* 중앙 채팅 영역의 메시지 출력 부분 */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* 중앙 채팅 영역의 메시지 출력 부분 중 map 내부 */}
          {messages.map((msg, i) => {
            const isUser = msg.role === 'user';
            const isAssistantWelcome = i === 0 && !isUser;
            
            // id가 없는 경우를 대비해 인덱스 활용, 
            // 새로 생성된 메시지에도 임시 ID가 잘 부여되어 있는지 확인해야 함
            const hasId = msg.id !== undefined && msg.id !== null;

            return (
              <div 
                key={msg.id || `msg-${i}`} 
                className={`flex items-center gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'} group w-full`}
              >
                {/* 1. 편집 모드일 때 체크박스 표시 (사용자/AI 공통 로직으로 정리 가능) */}
                {isEditMode && !isAssistantWelcome && (
                  <div className={`flex shrink-0 items-center justify-center ${isUser ? 'order-last ml-2' : 'mr-2'}`}>
                    <input 
                      type="checkbox" 
                      checked={selectedChatIds.includes(msg.id)}
                      onChange={() => toggleSelectChat(msg.id)}
                      // 스타일 보강: border가 연해서 안 보일 수 있으므로 색상 대비를 높임
                      className="w-5 h-5 cursor-pointer accent-blue-600 border-gray-400 border-2 rounded focus:ring-blue-500"
                    />
                  </div>
                )}

                {/* 2. 말풍선 덩어리 */}
                <div className={`flex items-start gap-2 max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`p-4 rounded-2xl text-sm shadow-sm ${
                    isUser 
                      ? 'bg-blue-600 text-white rounded-tr-none' 
                      : 'bg-gray-100 text-gray-800 rounded-tl-none'
                  }`}>
                    {msg.content}
                  </div>

                  {!isEditMode && (
                    <button 
                      onClick={() => saveToNote(msg.content)}
                      className="opacity-0 group-hover:opacity-100 p-1.5 rounded transition-opacity text-gray-400 shrink-0 hover:bg-gray-100"
                    >📌</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-6">
          <div className="max-w-3xl mx-auto flex items-center bg-gray-50 rounded-full px-6 border focus-within:ring-2 focus-within:ring-blue-100 transition">
            <input
              value={input}
              onChange={(e)=>setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className="flex-1 py-4 bg-transparent outline-none text-sm"
              placeholder="질문하세요..." />
            <button
              onClick={handleSend}
              className="text-blue-600 font-bold ml-2">↑</button>
          </div>
        </div>
      </main>

      {/* <-> 중앙과 오른쪽 사이의 수직 조절 선 */}
      {isSidebarOpen && (
        <div 
          onMouseDown={startResizingX}
          className="w-1.5 bg-gray-100 hover:bg-blue-400 cursor-col-resize transition-colors flex items-center justify-center group shrink-0"
        >
          <div className="h-8 w-1 bg-gray-300 group-hover:bg-white rounded-full"></div>
        </div>
      )}

      {/* 3. 오른쪽: 스튜디오 & 노트 */}
      <aside 
        style={{ width: isSidebarOpen ? `${rightSidebarWidth}px` : '0px' }}
        className={`bg-[#f1f3f4] flex flex-col h-full relative shrink-0 
          ${!isSidebarOpen ? 'invisible' : 'visible'} 
          ${isResizingX.current ? '' : 'transition-[width] duration-300'} // 드래그 중엔 애니메이션 끄기
        `}
      >
        {/* 닫기 버튼 */}
        <button 
          onClick={() => setIsSidebarOpen(false)}
          className="absolute top-4 right-4 z-10 p-2 hover:bg-gray-200 rounded-full text-gray-400 text-xs font-bold"
        >
          ✕ 닫기
        </button>

      {/* 3. 오른쪽: 스튜디오 및 노트 영역 */}
        {/* 스튜디오 섹션 (이미지 기반) */}
        <section
          className="p-5 border-b bg-white"
          style={{ height: `${studioHeight}px` }} >
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-bold text-gray-700 italic">스튜디오</h3>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {studioItems.map((item, i) => (
              <button 
                key={i} 
                onClick={() => runStudioFeature(item.name)} // handleSend 대신 새 함수 연결
                disabled={isSaving}
                className={`${item.color} p-3 rounded-xl flex items-center justify-between hover:opacity-80 transition group ${isSaving ? 'grayscale' : ''}`}
              >
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-sm">{item.icon}</span>
                  <span className="text-[11px] font-bold truncate">{item.name}</span>
                </div>
                {isSaving && <span className="animate-spin text-[10px]">⌛</span>}
              </button>
            ))}
          </div>
          {/*
          <div className="grid grid-cols-2 gap-2">
            {studioItems.map((item, i) => (
              <button key={i} className={`${item.color} p-3 rounded-xl flex items-center justify-between hover:opacity-80 transition group`}>
                <div className="flex items-center gap-2 overflow-hidden">
                  <span className="text-sm">{item.icon}</span>
                  <span className="text-[11px] font-bold truncate">{item.name}</span>
                </div>
                <span className="text-[10px] opacity-0 group-hover:opacity-100 text-gray-400">✎</span>
              </button>
            ))}
          </div>*/}
        </section>

        {/* 가로 구분선 (Resizer) */}
        <div 
          onMouseDown={startResizingY}
          className="h-1.5 bg-gray-200 hover:bg-blue-400 cursor-row-resize transition-colors flex items-center justify-center group"
        >
          <div className="w-8 h-1 bg-gray-300 group-hover:bg-white rounded-full"></div>
        </div>

        {/* 노트 섹션 */}
        <section className="flex-1 overflow-y-auto p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-4 tracking-widest">저장된 노트 ({notes.length})</h3>
          <div className="space-y-3">
            {notes.map((note) => {
              // JSON 데이터일 경우 제목(title)이나 주제를 추출
              let displayTitle = "";
              let displayBody = note.body;

              try {
                if (note.type === '퀴즈' || note.type === '플래시카드' || note.type === 'AI 오디오 오버뷰'|| note.type === '슬라이드' || note.type === '마인드맵' || note.type === '보고서') {
                  const parsed = JSON.parse(note.body);
                  displayTitle = parsed.title || parsed.topic || "제목 없음";
                  // 본문은 첫 번째 카드의 단어 등을 보여주어 힌트 제공
                  if (note.type === '플래시카드' && parsed.cards) {
                    displayBody = `${parsed.cards[0].term} 외 ${parsed.cards.length}개 항목`;
                  } else if (note.type === '퀴즈' && parsed.questions) {
                    displayBody = `${parsed.questions[0].question.substring(0, 30)}...`;
                  }else if (note.type === 'AI 오디오 오버뷰' && parsed.scripts) {
                    const firstLine = parsed.scripts[0].content;
                    displayBody = firstLine.length > 40 ? `${firstLine.substring(0, 40)}...` : firstLine;
                  }else if (note.type === '슬라이드' && parsed.slides) {
                    displayBody = `총 ${parsed.slides.length}장의 슬라이드 구성안`;
                  }else if (note.type === '마인드맵' && parsed.nodes) {
                    displayBody = `중심 주제: ${parsed.title} (총 ${parsed.nodes.length}개의 핵심 노드)`;
                  }else if (note.type === '보고서' && parsed.sections) {
                    displayBody = `분석 요약: ${parsed.summary.substring(0, 50)}...`;
                  }
                }
              } catch (e) {
                displayTitle = ""; // 일반 노트는 제목 없음
              }

              return (
                <div 
                  key={note.id} 
                  onClick={() => setSelectedNote(note)} 
                  className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:border-blue-200 transition cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold text-blue-500 uppercase">{note.type}</span>
                    <button 
                      onClick={(e) => removeNote(note.id, e)} 
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 transition-all"
                    >✕</button>
                  </div>
                  
                  {/* 주제(Title)가 있으면 강조해서 표시 */}
                  {displayTitle && (
                    <h4 className="text-sm font-bold text-gray-800 mb-1 truncate group-hover:text-blue-600 transition-colors">
                      {displayTitle}
                    </h4>
                  )}
                  
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{displayBody}</p>
                  
                  {note.date && (
                    <span className="text-[9px] text-gray-300 mt-2 block">{note.date} 저장됨</span>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </aside>

      {selectedNote && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedNote(null)} // 배경 클릭 시 닫기
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`
              relative transition-all duration-500 ease-in-out
              ${selectedNote.type === '보고서' 
                ? 'w-[90vw] max-w-[1000px] h-[85vh]'
                : selectedNote.type === '슬라이드' 
                ? 'w-[65vw] max-w-[1400px] h-[65vh]'
                : selectedNote.type === '마인드맵'
                ? 'w-[95vw] max-w-[1600px] h-[85vh]'
                : 'w-full max-w-2xl h-auto'}           {/* 일반 노트는 기본 크기 */}
            `}>
            {/* 닫기 버튼 */}
            <button 
              onClick={() => setSelectedNote(null)} 
              className="absolute -top-12 right-0 text-white flex items-center gap-2 hover:text-blue-200 transition-colors"
            >
              <span className="text-sm font-bold">✕ 닫기</span>
            </button>
            
            {/* 데이터 타입에 따른 인터랙티브 UI 출력 */}
            <div className="max-h-[85vh] overflow-y-auto rounded-3xl shadow-2xl">
              {selectedNote.type === '퀴즈' ? (
                // onClose prop에 상태를 null로 만드는 함수를 전달해
                <QuizCard 
                  data={JSON.parse(selectedNote.body)} 
                  onClose={() => setSelectedNote(null)} 
                />
              ) : selectedNote.type === '플래시카드' ? (
                <Flashcard 
                  data={JSON.parse(selectedNote.body)} 
                  onClose={() => setSelectedNote(null)}
                />
              ) : selectedNote.type === 'AI 오디오 오버뷰' ? (
                (() => {
                  try {
                    // JSON만 추출하는 로직을 변수 안에서 처리
                    const jsonContent = selectedNote.body.match(/\{[\s\S]*\}/)?.[0] || selectedNote.body;
                    return <AudioOverview data={JSON.parse(jsonContent)} onClose={() => setSelectedNote(null)} />;
                  } catch (e) {
                    return (
                      <div className="bg-white p-10 rounded-3xl">
                        <h2 className="text-red-500 font-bold mb-4">데이터 파싱 오류</h2>
                        <p className="text-sm text-gray-600 mb-4">AI가 생성한 데이터 형식이 올바르지 않아. 내용을 텍스트로 보여줄게.</p>
                        <pre className="whitespace-pre-wrap text-xs bg-gray-50 p-4 rounded-xl">{selectedNote.body}</pre>
                        <button onClick={() => setSelectedNote(null)} className="mt-4 text-blue-600 font-bold">닫기</button>
                      </div>
                    );
                  }
                })()
              ) : selectedNote.type === '슬라이드' ? (
                <SlideViewer 
                  data={JSON.parse(selectedNote.body)} 
                  onClose={() => setSelectedNote(null)} 
                />
              ) : selectedNote.type === '마인드맵' ? (
                <MindmapView data={selectedNote.body} onClose={() => setSelectedNote(null)} />
              ) : selectedNote.type === '보고서' ? (
                <ReportView data={selectedNote.body} onClose={() => setSelectedNote(null)} />
              ) : (// 일반 노트일 때
                <div className="bg-white p-10 rounded-3xl">
                  <h2 className="text-blue-600 font-bold mb-4 uppercase text-xs tracking-widest">저장된 노트</h2>
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans">
                    {selectedNote.body}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}