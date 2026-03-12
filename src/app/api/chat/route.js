// GPT 사용
/*import { NextResponse } from 'next/server';

export async function POST(req) {
  try {
    // 1. 프론트에서 보낸 데이터 받기 (images 추가)
    const { messages, selectedSources, images } = await req.json();

    // 2. 시스템 프롬프트 설정
    const systemContext = selectedSources && selectedSources.length > 0
      ? `사용자가 선택한 소스(${selectedSources.join(', ')})의 내용을 바탕으로 답변하세요.`
      : "제공된 소스가 없습니다. 일반적인 지식으로 답변하세요.";

    // 3. 메시지 구조 재구성 (Vision API 대응)
    const lastMessage = messages[messages.length - 1];
    
    // 마지막 유저 메시지를 텍스트+이미지 혼합 형식으로 변환
    const userContent = [{ type: "text", text: lastMessage.content }];

    // 전송된 이미지가 있다면 추가
    if (images && images.length > 0) {
      images.forEach(imgBase64 => {
        userContent.push({
          type: "image_url",
          image_url: { url: imgBase64 } // base64 데이터가 그대로 들어감
        });
      });
    }

    const formattedMessages = [
      { role: 'system', content: systemContext },
      ...messages.slice(0, -1), // 마지막 메시지 제외한 이전 대화
      { role: 'user', content: userContent } // 이미지가 포함된 마지막 메시지
    ];

    // 4. OpenAI 호출
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // 비전 기능을 지원하는 모델
        messages: formattedMessages,
        max_tokens: 1000,
      }),
    });

    const data = await response.json();

    if (data.error) {
      console.error("OpenAI Error:", data.error);
      return NextResponse.json({ role: 'assistant', content: 'AI 응답 중 오류: ' + data.error.message }, { status: 500 });
    }

    return NextResponse.json(data.choices[0].message);

  } catch (err) {
    console.error("Server Error:", err);
    // [중요] 에러 발생 시 빈 응답이 아닌 JSON 에러 메시지를 보냄
    return NextResponse.json({ role: 'assistant', content: '서버 내부 오류가 발생했습니다.' }, { status: 500 });
  }
}*/


// api/chat/route.js
import { VertexAI } from '@google-cloud/vertexai';

export async function POST(req) {
  try {
    const { messages, selectedSources, mode } = await req.json();
    
    const vertexAI = new VertexAI({
      project: process.env.GCP_PROJECT_ID,
      location: process.env.GCP_LOCATION,
    });
    const model = vertexAI.getGenerativeModel({ model: 'gemini-2.0-flash-001' });

    // 1. 파일 데이터 준비 (이미지, PDF 포함)
    const fileParts = await Promise.all((selectedSources || []).map(async (src) => {
      const fileResponse = await fetch(src.url);
      const buffer = await fileResponse.arrayBuffer();
      return { inlineData: { data: Buffer.from(buffer).toString('base64'), mimeType: src.type } };
    }));

    // 2. 모드별 특화 프롬프트 설정
    let systemInstruction = "당신은 문서 분석 전문가입니다.";
    // route.js 내부의 mode 조건문 수정
    if (mode === "퀴즈") {
      systemInstruction = `제공된 소스 내용을 바탕으로 학습용 객관식 퀴즈 10개를 생성하세요. 
      반드시 아래 JSON 형식으로만 응답하세요. 
      설명이나 인사말은 절대 포함하지 마세요.
      {
        "type": "QUIZ",
        "title": "문서 핵심 내용 퀴즈 (10문항)",
        "questions": [
          {
            "id": 1,
            "question": "질문 내용",
            "options": ["보기A", "보기B", "보기C", "보기D"],
            "answerIndex": 0, 
            "explanation": "이 문제는 ~에 관한 것으로 정답은 ~입니다. (한 줄 해설)"
          }
        ]
      }`;
    } else if (mode === "플래시카드") {
      systemInstruction = `내용을 플래시카드로 요약하세요. 
      반드시 아래 JSON 형식으로만 응답하세요:
      {
        "type": "FLASHCARD",
        "cards": [
          { "term": "단어", "definition": "정의" }
        ]
      }`;
    } else if (mode === "보고서") {
      systemInstruction = "문서의 내용을 요약하여 구조적인 보고서 형식으로 작성하세요.";
    }

    const promptParts = [
      { text: systemInstruction },
      ...fileParts,
      { text: messages[messages.length - 1].content }
    ];

    const result = await model.generateContent({ contents: [{ role: 'user', parts: promptParts }] });
    const aiResponse = result.response.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ content: aiResponse }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}

/*import { VertexAI } from '@google-cloud/vertexai';

export async function POST(req) {
  try {
    const { messages, selectedSources, mode } = await req.json();
    const lastMessage = messages[messages.length - 1].content;

    const vertexAI = new VertexAI({
      project: process.env.GCP_PROJECT_ID,
      location: process.env.GCP_LOCATION,
    });
    const model = vertexAI.getGenerativeModel({ model: 'gemini-2.0-flash-001' });

    // 1. 모든 소스 파일을 Gemini용 멀티모달 데이터로 변환
    const fileParts = await Promise.all((selectedSources || []).map(async (src) => {
      try {
        const fileResponse = await fetch(src.url);
        const buffer = await fileResponse.arrayBuffer();
        const base64Data = Buffer.from(buffer).toString('base64');
        
        return {
          inlineData: {
            data: base64Data,
            mimeType: src.type // image/png, application/pdf 등을 자동으로 처리
          }
        };
      } catch (err) {
        console.error(`${src.name} 처리 실패:`, err);
        return null;
      }
    }));

    // 유효한 파일 데이터만 필터링
    const validFileParts = fileParts.filter(part => part !== null);

    // 2. 프롬프트 구성 (지시사항 + 파일 데이터 + 질문)
    const promptParts = [
      { text: `당신은 문서 및 이미지 분석 전문가입니다. 제공된 모든 파일(이미지, PDF 등)의 내용을 철저히 분석하여 사용자의 질문에 답하세요. 모드: ${mode}` },
      ...validFileParts,
      { text: `사용자 질문: ${lastMessage}` }
    ];

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: promptParts }],
    });

    const aiResponse = result.response.candidates[0].content.parts[0].text;

    return new Response(JSON.stringify({ role: 'assistant', content: aiResponse }), { status: 200 });

  } catch (error) {
    console.error("Vertex AI 서버 에러:", error);
    return new Response(JSON.stringify({ role: 'assistant', content: `에러: ${error.message}` }), { status: 500 });
  }
}*/