export async function onRequestGet(ctx) {

  let url = new URL(ctx.request.url);

  async function gatherResponse(res) {
    const { headers } = res;
    const contentType = headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return JSON.stringify(await res.json());
    }
    return res.text();
  }

  const init = {
    headers: {
      "content-type": "application/json;charset=UTF-8",
    },
  };

  _response = await server.http.post('https://api.openai.com/v1/chat/completions', {
    // "prompt": prompt,
    "model": "gpt-3.5-turbo",
    // "model": "text-davinci-003",
    "messages": req.body.messages,
    // "temperature": 0.7,
    // "frequency_penalty": 0.5
  }, { headers: { 'Authorization': OPEN_AI_KEY } })    

  const response = await fetch('https://nano.to/known.json', init);

  const results = await gatherResponse(_response);

  const res = Response.json({ response });

  res.headers.set('Access-Control-Allow-Origin', '*');

  return res;

}
