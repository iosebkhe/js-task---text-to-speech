export default class MyClass {
  constructor(credentials) {
    this.text = "";
    this.onresult = null;
    this.accessToken = null;
    this.refreshToken = null;
    this.credentials = credentials;
  }

  async start() {
    if (!this.accessToken) {
      await this.retrieveAccessToken();
    }

    let substring = "";
    const promises = [];

    for (let i = 0; i < this.text.length; i++) {
      const character = this.text[i];

      if (
        character === "." ||
        character === "!" ||
        character === "?" ||
        character === ";" ||
        character === ","
      ) {
        if (substring.length > 0) {
          const promise = this.sendTextToBackend(substring);
          promises.push(promise);
          substring = "";
        }
      } else {
        substring += character;
      }
    }

    if (substring.length > 0) {
      const promise = this.sendTextToBackend(substring);
      promises.push(promise);
    }

    try {
      const results = await Promise.all(promises);
      results.forEach((result) => {
        if (this.onresult) {
          this.onresult(result);
        }
      });
    } catch (error) {
      alert(error);
    }
  }

  onresultHandler(result) {
    if (this.onresult) {
      this.onresult(result);
    }
  }

  async retrieveAccessToken() {
    const loginEndpoint = "https://enagramm.com/API/Account/Login";

    try {
      const response = await fetch(loginEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(this.credentials),
      });

      const data = await response.json();
      this.accessToken = data.AccessToken;
      this.refreshToken = data.RefreshToken;
    } catch (error) {
      console.error(error);
    }
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error("Refresh token is missing.");
    }

    const refreshTokenEndpoint =
      "https://enagramm.com/API/Account/RefreshToken";

    try {
      const response = await fetch(refreshTokenEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ RefreshToken: this.refreshToken }),
      });

      const data = await response.json();
      this.accessToken = data.AccessToken;
      this.refreshToken = data.RefreshToken;
    } catch (error) {
      console.error(error);
    }
  }

  sendTextToBackend(sentence) {
    const model = {
      Language: "ka",
      Text: sentence,
      Voice: 0,
      iterationCount: 2,
    };

    const ttsEndpoint = "https://enagramm.com/API/TTS/SynthesizeTextAudioPath";

    return new Promise((resolve, reject) => {
      fetch(ttsEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify(model),
      })
        .then((response) => response.json())
        .then((result) => {
          resolve(result);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  getLastPunctuationIndex(text) {
    const punctuationMarks = [".", "!", "?", ";", ","];
    let lastPunctuationIndex = -1;

    for (let i = text.length - 1; i >= 0; i--) {
      if (punctuationMarks.includes(text[i])) {
        lastPunctuationIndex = i;
        break;
      }
    }

    return lastPunctuationIndex;
  }
}
