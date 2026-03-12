import { google } from 'googleapis';

export async function POST(req) {
  const { title, slides } = await req.json();
  
  // 1. 인증 설정 (사용자 토큰이 필요함)
  // 실제 서비스에서는 NextAuth 등을 통해 받은 access_token을 사용해야 해.
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  // auth.setCredentials({ access_token: '사용자의_액세스_토큰' });

  const slidesService = google.slides({ version: 'v1', auth });

  try {
    // 2. 새 슬라이드 생성
    const presentation = await slidesService.presentations.create({
      requestBody: { title },
    });
    const presentationId = presentation.data.presentationId;

    return new Response(JSON.stringify({ url: `https://docs.google.com/presentation/d/${presentationId}` }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
}