/**
 * scripts/generate-brief.js
 *
 * Generates a daily market brief via Claude API and writes it as MDX frontmatter.
 * Called by .github/workflows/daily-research.yml
 *
 * Required env vars:
 *   ANTHROPIC_API_KEY
 *   DATE           — YYYY-MM-DD
 *   BRIEF_FILE     — output path (e.g. content/blog/brief-2026-06-14.md)
 *   NEWS_CONTEXT   — pre-fetched headlines (optional)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) { console.log('No API key'); process.exit(0); }

const date = process.env.DATE || new Date().toISOString().slice(0, 10);
const briefFile = process.env.BRIEF_FILE || `content/blog/brief-${date}.md`;
const newsContext = process.env.NEWS_CONTEXT || '(최신 뉴스 없음)';

const requestBody = JSON.stringify({
  model: 'claude-sonnet-4-6',
  max_tokens: 3000,
  system: '당신은 메르(전문 투자 블로거) 스타일로 데일리 시장 브리핑을 작성하는 AI 리서치 에이전트입니다. 번호 붙인 단락 형식(1. 2. 3. ...)으로 작성하세요. 지정학→거시경제→섹터→종목 체인 구조, 각 단락 2-4문장, 전체 15-20개 단락. 투자 결정에 직접 도움되는 밀도 높은 한국어 분석.',
  messages: [{
    role: 'user',
    content: '오늘(' + date + ') 반도체/AI 인프라 투자 데일리 브리핑을 작성하세요.\n\n최근 뉴스:\n' + newsContext + '\n\n커버리지 유니버스: 삼성전자, SK하이닉스, 피에스케이홀딩스, 한미반도체, 삼성전기, NVDA, MRVL, AMAT, LRCX, MU, ARM, 어드밴테스트, 도쿄일렉트론\n\n제목은 오늘의 핵심 이슈를 메타포로 표현하세요. 본문은 번호 단락 형식.'
  }]
});

const options = {
  hostname: 'api.anthropic.com',
  path: '/v1/messages',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'Content-Length': Buffer.byteLength(requestBody)
  }
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      const text = response.content?.[0]?.text || '';
      if (!text) { console.log('Empty response'); process.exit(0); }

      const lines = text.split('\n').filter(l => l.trim());
      const firstLine = lines[0] || '';
      const title = firstLine.startsWith('#')
        ? firstLine.replace(/^#+\s*/, '')
        : '시장 브리핑: ' + date;

      const bodyLines = firstLine.startsWith('#') ? lines.slice(1) : lines;
      const body = bodyLines.join('\n\n');

      const frontmatter = [
        '---',
        'title: "' + title.replace(/"/g, '\\"') + '"',
        'date: "' + date + '"',
        'category: "데일리브리핑"',
        'tags: ["NVDA", "반도체", "AI인프라", "HBM"]',
        'summary: "AI 리서치 에이전트의 ' + date + ' 데일리 시장 브리핑."',
        'author: "AI Research Agent"',
        '---',
        '',
        body
      ].join('\n');

      const dir = path.dirname(briefFile);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(briefFile, frontmatter, 'utf-8');
      console.log('Brief saved to ' + briefFile);
    } catch (e) {
      console.error('Parse error:', e.message);
    }
  });
});
req.on('error', e => console.error('Request error:', e.message));
req.write(requestBody);
req.end();
