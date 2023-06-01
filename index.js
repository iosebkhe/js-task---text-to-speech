export default class MyClass {
  constructor(credentials) {
    this.text = "";
    this.onresult = null;
    this.accessToken = null;
    this.refreshToken = null;
    this.credentials = credentials;
  }

  // მთავარი მეთოდი რომელიც ამუშავებს ტექსტს.
  // თუ ტოკენის ვადა გასულია ავტომატურად ითხოვს ახალ ტოკენს.
  async start() {
    if (!this.accessToken) {
      await this.retrieveAccessToken();
    }

    if (this.text.length <= 150) {
      this.sendTextToBackend(this.text);
    } else {
      let remainingText = this.text;
      let startIndex = 0;
      let endIndex = 150;

      while (remainingText.length > 0) {
        if (remainingText.length <= endIndex) {
          this.sendTextToBackend(remainingText);
          break;
        }

        let subText = remainingText.substring(startIndex, endIndex);
        let lastPunctuationIndex = this.getLastPunctuationIndex(subText);

        if (lastPunctuationIndex === -1) {
          // თუ ის ნიშნები არ იქნება ნაპოვნით რაც საჭიროა ტექსტის დასამუშავებლად
          // ბექში აგზავნის მთლიან ტექსტს.
          this.sendTextToBackend(subText);
          remainingText = remainingText.substring(subText.length);
        } else {
          // დაამუშავე ტექსტი მოცემული პირობით.
          let sentence = subText.substring(0, lastPunctuationIndex + 1);
          this.sendTextToBackend(sentence);
          remainingText = remainingText.substring(sentence.length);
        }
      }
    }
  }

  // მეთოდი რომელიც გვაჩვენებს საბოლოო რეზულტატს.
  onresult(result) {
    if (this.onresult) {
      this.onresult(result);
    }
  }

  // ტოკენის მოთხოვნა
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

  // ტოკენის მოთხოვნა თუ წინას ვადა გაუვიდა.
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

  // დაჭრილი ტექსტის გაგზავნა ბექენდში, და პასუხის მიღება
  sendTextToBackend(sentence) {
    const model = {
      Language: "ka",
      Text: sentence,
      Voice: 0,
      iterationCount: 2,
    };

    const ttsEndpoint = "https://enagramm.com/API/TTS/SynthesizeTextAudioPath";

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
        if (this.onresult) {
          this.onresult(result);
        }
      })
      .catch((error) => {
        alert(error);
      });
  }

  getLastPunctuationIndex(text) {
    const punctuationMarks = [".", "!", "?", ";", ",", " "];
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
