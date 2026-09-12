// ===================================================
// Gemini에게 물어보는 서버 코드가 들어올 자리 (아직 비어 있습니다)
//
// 왜 서버가 필요한가요?
//   API 키를 브라우저 코드(app.js)에 적으면 누구나 볼 수 있습니다.
//   그래서 키는 서버에만 두고, 브라우저는 이 주소로 부탁만 합니다.
//
// 왜 Firebase Functions가 아니라 여기인가요?
//   Firebase Functions는 유료 요금제(Blaze)라야 씁니다.
//   이 프로젝트는 무료 요금제(Spark)로 진행하므로,
//   서버가 필요한 일은 Vercel의 무료 함수로 처리합니다.
//
// 이 파일의 규칙
//   api 폴더 안의 파일은 Vercel에서 자동으로 서버 주소가 됩니다.
//   이 파일은 /api/gemini 주소가 됩니다.
//   API 키는 코드에 적지 말고 Vercel 환경변수에 넣습니다. (process.env 로 꺼내 씁니다)
// ===================================================

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "POST 요청만 사용할 수 있습니다." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY 환경변수를 확인해 주세요." });
  }

  const memos = Array.isArray(req.body?.memos)
    ? req.body.memos
        .filter(function (memo) {
          return typeof memo === "string";
        })
        .map(function (memo) {
          return memo.trim().slice(0, 50);
        })
        .filter(Boolean)
        .slice(0, 100)
    : [];

  if (memos.length === 0) {
    return res.status(400).json({ error: "코멘트할 게시물이 없습니다." });
  }

  const memoText = memos
    .map(function (memo, index) {
      return `${index + 1}. ${memo}`;
    })
    .join("\n");

  const prompt = `당신은 초등·중등 교사를 돕는 따뜻하고 신중한 교육 조력자입니다.
아래 학급 담벼락 게시물 전체를 살펴보고 교사가 학생들에게 들려줄 종합 코멘트를 한국어로 작성하세요.
공통된 분위기나 생각을 짚고, 긍정적인 점을 먼저 말한 뒤 도움이 될 질문이나 다음 활동을 제안하세요.
학생을 평가하거나 진단하지 말고, 이름이나 신원을 추측하지 마세요.
게시물에 부적절하거나 위험한 표현이 있으면 그대로 반복하지 말고 교사가 확인할 필요가 있다고 조심스럽게 알려 주세요.
제목 없이 3~5문장으로 간결하게 작성하세요.

[게시물]
${memoText}`;

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 350
          }
        })
      }
    );

    const data = await response.json();
    if (!response.ok) {
      console.error("Gemini API 오류:", data?.error?.message || response.status);
      return res.status(502).json({ error: "AI 코멘트를 만들지 못했습니다. 잠시 후 다시 시도해 주세요." });
    }

    const comment = data.candidates?.[0]?.content?.parts
      ?.map(function (part) {
        return part.text || "";
      })
      .join("")
      .trim();

    if (!comment) {
      return res.status(502).json({ error: "AI가 코멘트를 반환하지 않았습니다." });
    }

    return res.status(200).json({ comment: comment });
  } catch (error) {
    console.error("Gemini 호출 실패:", error);
    return res.status(500).json({ error: "AI 서버에 연결하지 못했습니다." });
  }
}
