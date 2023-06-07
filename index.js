export default class MyClass {
  constructor(credentials) {
    this.text = "";
    this.onresult = null;
    this.accessToken = null;
    this.refreshToken = null;
    this.credentials = credentials;
    this.segments = [];
  }

  // ტექსტის სეგმენტებად დაჭრა
  cutText() {
    const startIndex = 150;
    const endIndex = 230;
    const extractedSegments = [];

    for (let i = 0; i < this.text.length; i += endIndex) {
      const segment = this.text.slice(i, i + endIndex);

      if (segment.length > startIndex) {
        const extractedSegment = segment.slice(startIndex, endIndex);
        extractedSegments.push(extractedSegment);
      }
    }

    this.segments = extractedSegments;
  }

  // ტექსტის სეგმენტების დაჭრა სასვენ ნიშნებზე და სფეისზე
  cutSegmentOnPunctuation(segment) {
    const punctuationPriority = [".", "!", "?", ";", ","];
    const cutSegments = [];
    let startIndex = 0;

    while (startIndex < segment.length) {
      let cuttingIndex = segment.length;
      let punctuationIndex = -1;

      // Find the punctuation index with the highest priority
      for (let i = 0; i < punctuationPriority.length; i++) {
        const punctuation = punctuationPriority[i];
        const index = segment.indexOf(punctuation, startIndex);

        if (index !== -1 && index < cuttingIndex) {
          cuttingIndex = index;
          punctuationIndex = i;
        }
      }

      if (punctuationIndex !== -1) {
        const cutSegment = segment.slice(startIndex, cuttingIndex + 1);
        cutSegments.push(cutSegment);
        startIndex = cuttingIndex + 1;
      } else {
        const cutSegment = segment.slice(startIndex);
        cutSegments.push(cutSegment);
        break;
      }
    }

    console.log(cutSegments);
    return cutSegments;
  }

  // სტარტ მეთოდი რომელიც ამუშავებს ტექსტს
  async start() {
    this.cutText();
    await this.retrieveAccessToken();

    const promises = [];

    for (let i = 0; i < this.segments.length; i++) {
      const segment = this.segments[i];
      const cutSegments = this.cutSegmentOnPunctuation(segment);

      for (let j = 0; j < cutSegments.length; j++) {
        const cutSegment = cutSegments[j];
        const promise = this.sendTextToBackend(cutSegment);
        promises.push(promise);
      }
    }

    try {
      const results = await Promise.all(promises);
      results.forEach((result) => {
        this.onresultHandler(result);
      });
    } catch (error) {
      console.error(error);
    }
  }

  // მეთოდი რომელსაც გამოაქვს რეზულტატი
  onresultHandler(result) {
    if (this.onresult) {
      this.onresult(result);
    }
  }

  // ტოკენის მიღება
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

  // ტოკენის დარეფრეშება თუ ძველს ვადა გაუვიდა
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error("ტოკენი არ არსებობს");
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

  // დაჭრილი ტექსტის გაგზავნა სერვერზე
  async sendTextToBackend(sentence) {
    const model = {
      Language: "ka",
      Text: sentence,
      Voice: 0,
      iterationCount: 2,
    };

    const ttsEndpoint = "https://enagramm.com/API/TTS/SynthesizeTextAudioPath";

    if (!this.accessToken) {
      await this.retrieveAccessToken();
    }

    return fetch(ttsEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify(model),
    })
      .then((response) => {
        if (response.status === 401) {
          return this.refreshAccessToken().then(() =>
            this.sendTextToBackend(sentence)
          );
        }
        return response.json();
      })
      .catch((error) => {
        console.error(error);
        throw error;
      });
  }
}
