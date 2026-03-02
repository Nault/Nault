/**
 * Work In Progress
 */

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

  const response = await server.http.post('https://api.openai.com/v1/chat/completions', {
    // "prompt": prompt,
    "model": "gpt-3.5-turbo",
    // "model": "text-davinci-003",
    "messages": req.body.messages,
    // "temperature": 0.7,
    // "frequency_penalty": 0.5
  }, { headers: { 'Authorization': OPEN_AI_KEY } })    

  // const json = await fetch('https://raw.githubusercontent.com/fwd/nano-to/master/known.json', init);
  
  const results = await gatherResponse(response);
  
  // let name = url.searchParams.get('names');
      // name = name ? name.replace('@', '') : ''

  const res = Response.json(results);
  
  res.headers.set('Access-Control-Allow-Origin', '*');
  
  return res;

}