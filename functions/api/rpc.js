/**
 * Work In Progress
 */

export default {
  async fetch(request) {
    
    /**
     * Example someHost is set up to take in a JSON request
     * Replace url with the host you wish to send requests to
     * @param {string} url the URL to send the request to
     * @param {BodyInit} body the JSON data to send in the request
     */
    const someHost = "https://rpc.nano.to";

    const url = someHost + "/requests/json";

    const body = {
      results: ["default data to send"],
      errors: null,
      msg: "I sent this to the fetch",
    };

    /**
     * gatherResponse awaits and returns a response body as a string.
     * Use await gatherResponse(..) in an async function to get the response body
     * @param {Response} response
     */
    async function gatherResponse(response) {
      const { headers } = response;
      const contentType = headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        return JSON.stringify(await response.json());
      } else if (contentType.includes("application/text")) {
        return response.text();
      } else if (contentType.includes("text/html")) {
        return response.text();
      } else {
        return response.text();
      }
    }

    const init = {
      body: JSON.stringify(body),
      method: "POST",
      headers: {
        "content-type": "application/json;charset=UTF-8",
      },
    };
    const response = await fetch(url, init);
    const results = await gatherResponse(response);
    const res = Response.json(results);
    res.headers.set('Access-Control-Allow-Origin', '*');
    return res;
  },
};