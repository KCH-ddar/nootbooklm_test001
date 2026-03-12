// src/app/api/video/generate/route.js
import { PredictionServiceClient } from '@google-cloud/aiplatform';
import { helpers } from '@google-cloud/aiplatform';

// GCP 설정 (환경 변수에서 가져옴)
const projectId = process.env.GOOGLE_CLOUD_PROJECT;
const location = 'us-central1'; // Veo는 us-central1에서 지원됨
const modelId = 'veo'; // 또는 구체적인 Veo 모델 버전 ID

export async function POST(req) {
  const { prompt, sceneNumber } = await req.json();

  if (!prompt) {
    return Response.json({ error: "프롬프트가 없습니다." }, { status: 400 });
  }

  // 1. Vertex AI 클라이언트 초기화 (서비스 계정 인증 필요)
  const client = new PredictionServiceClient({
    apiEndpoint: `${location}-aiplatform.googleapis.com`,
    // 로컬 개발 시 GOOGLE_APPLICATION_CREDENTIALS 환경 변수가 가리키는 JSON 키 파일을 자동으로 사용함
  });

  const endpoint = `projects/${projectId}/locations/${location}/publishers/google/models/${modelId}`;

  // 2. Veo 요청 파라미터 구성
  const instance = helpers.toValue({
    prompt: prompt,
    // 필요에 따라 카메라 컨트롤, 스타일 등을 추가로 설정 가능
    // aspect_ratio: "16:9",
    // fps: 24,
  });
  const instances = [instance];

  const parameters = helpers.toValue({
    // 생성할 영상의 길이 (초 단위, Veo 모델 사양에 따라 제한됨)
    duration_seconds: 5, 
    // 결과물을 저장할 GCS 버킷 경로 (필수)
    gcs_destination: {
      output_uri_prefix: `gs://${process.env.GOOGLE_CLOUD_STORAGE_BUCKET}/veo-outputs/scene-${sceneNumber}/`
    }
  });

  try {
    // 3. Veo 모델 호출 (비동기 작업 실행 - LRO)
    console.log(`장면 ${sceneNumber} 생성 시작: ${prompt}`);
    const [operation] = await client.predict({
      endpoint,
      instances,
      parameters,
    });

    // 4. 생성 작업 완료 대기 (LRO 폴링)
    // Veo 비디오 생성은 시간이 꽤 걸리므로(수십 초~몇 분), 실제 서비스에서는 백엔드에서 따로 처리하고 완료 알림을 주는 방식이 좋지만, 
    // 여기서는 간단하게 클라이언트 요청을 대기시키는 방식을 사용함.
    console.log("생성 작업 대기 중...");
    const [response] = await operation.promise(); // 작업이 완료될 때까지 대기

    // 5. 결과 확인 및 URL 추출
    const predictions = response.predictions;
    if (predictions && predictions.length > 0) {
      const result = helpers.fromValue(predictions[0]);
      // Veo는 생성된 영상을 GCS에 저장하고 그 경로를 반환함.
      // 이를 브라우저에서 접근 가능한 'storage.googleapis.com' URL로 변환해야 함.
      const gcsUri = result.gcs_uri; 
      const videoUrl = gcsUri.replace('gs://', 'https://storage.googleapis.com/');
      
      console.log("생성 완료:", videoUrl);
      return Response.json({ videoUrl }, { status: 200 });
    } else {
      throw new Error("생성된 비디오 데이터를 찾을 수 없습니다.");
    }

  } catch (error) {
    console.error("Veo API 호출 중 심각한 오류:", error);
    return Response.json({ error: error.message || "동영상 생성 중 오류가 발생했습니다." }, { status: 500 });
  }
}