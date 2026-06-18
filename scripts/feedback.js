export async function generateFeedback({ result, risk, pr, files, commits, authorData }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return "_AI feedback unavailable — OPENAI_API_KEY not set._";

  const failed = result.checks
    .filter(c => !c.passed)
    .map(c => `- ${c.name} (${c.score}/${c.max}): ${c.detail}`)
    .join("\n");

  const commitMessages = commits
    .slice(0, 5)
    .map(c => `- ${c.commit.message.split("\n")[0]}`)
    .join("\n");

  const changedFiles = files
    .slice(0, 10)
    .map(f => `- ${f.filename} (+${f.additions} -${f.deletions})`)
    .join("\n");

  const prompt = `You are a Bitcoin Core contributor mentor. A contributor opened a pull request that failed the automated quality gate.

PR Title: ${pr.title}
PR Description: ${pr.body || "(no description provided)"}
Risk level: ${risk.level}

Commit messages:
${commitMessages}

Changed files:
${changedFiles}

Failed checks:
${failed}

Write specific, actionable feedback to help this contributor fix their PR. Reference Bitcoin Core's CONTRIBUTING.md. Under 300 words. Markdown bullet points. Be direct but respectful.`;

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3
      })
    });

    if (!res.ok) {
      console.error("OpenAI error:", await res.text());
      return "_AI feedback generation failed._";
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "_No feedback generated._";

  } catch (err) {
    console.error("Feedback error:", err);
    return "_AI feedback generation failed due to a network error._";
  }
}