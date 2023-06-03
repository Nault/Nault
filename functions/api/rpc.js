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

  const _response = await fetch('https://nano.to/known.json', init);
  const results = await gatherResponse(_response);
  let name = url.searchParams.get('names');
      name = name ? name.replace('@', '') : ''

  const response = Response.json({ names: JSON.parse(results).filter(a => a.name.toLowerCase() === name.toLowerCase() || a.address === name) });
  response.headers.set('Access-Control-Allow-Origin', '*');
  return response;

}
