import { type NextRequest } from 'next/server'
import type { SlotDef } from '@/lib/types'
import { decadeLabel } from '@/lib/scoring'

export async function POST(request: NextRequest) {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return Response.json({ summary: null, title: null })

  const { slots, genre }: { slots: SlotDef[]; genre: string } = await request.json()

  const find = (key: string) => slots.find(s => s.key === key)?.card
  const director    = find('Director')
  const leadActor   = find('Lead Actor')
  const leadActress = find('Lead Actress')
  const suppActor   = find('Supporting Actor')
  const suppActress = find('Supporting Actress')
  const cin         = find('Cinematographer')
  const writer      = find('Screenplay')

  const crewLines = [
    director    && `Director: ${director.name} (${decadeLabel(director.decade)}) — known for ${director.films.map(f => f.title).join(', ')}`,
    leadActor   && `Lead Actor: ${leadActor.name} (${decadeLabel(leadActor.decade)}) — known for ${leadActor.films.map(f => f.title).join(', ')}`,
    leadActress && `Lead Actress: ${leadActress.name} (${decadeLabel(leadActress.decade)}) — known for ${leadActress.films.map(f => f.title).join(', ')}`,
    suppActor   && `Supporting Actor: ${suppActor.name} (${decadeLabel(suppActor.decade)})`,
    suppActress && `Supporting Actress: ${suppActress.name} (${decadeLabel(suppActress.decade)})`,
    cin         && `Cinematographer: ${cin.name} (${decadeLabel(cin.decade)})`,
    writer      && `Screenplay: ${writer.name} (${decadeLabel(writer.decade)})`,
  ].filter(Boolean).join('\n')

  const prompt = `You are a delightfully unhinged film critic writing for "Cahiers du Cinéma Absurde."

A fictional ${genre} film has been made by the following crew, each operating in their noted decade:
${crewLines}

Your task:
1. Invent a ridiculous, pretentious film title.
2. Write exactly 3 sentences: a deranged plot synopsis, a note about the performances, and a wildly over-the-top critical verdict.

Rules: be absurd, funny, and pompous. Reference the actual decades and people's known work. No asterisks, no markdown, no quotation marks around the title.
Start your response with just the title on its own line, then a blank line, then the 3-sentence review.`

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 1.4, maxOutputTokens: 300 },
        }),
      }
    )

    if (!res.ok) return Response.json({ summary: null, title: null })
    const data = await res.json()
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''

    // Split title from body
    const lines = text.trim().split('\n').filter((l: string) => l.trim())
    const title   = lines[0]?.trim() ?? null
    const summary = lines.slice(1).join(' ').trim() || null

    return Response.json({ title, summary })
  } catch {
    return Response.json({ summary: null, title: null })
  }
}
