const Mfrc522 = require("mfrc522-rpi");
const SoftSPI = require("rpi-softspi");

exports.RfidReader = class RfidReader {
  constructor() {
    const softSPI = new SoftSPI({
      clock: 23, // pin number of SCLK
      mosi: 19, // pin number of MOSI
      miso: 21, // pin number of MISO
      client: 24 // pin number of CS
    });

    this.mfrc522 = new Mfrc522(softSPI).setResetPin(22);
  }

  read(callback) {
    console.log("scanning...");
    console.log("Please put chip or keycard in the antenna inductive zone!");
    console.log("Press Ctrl-C to stop.");

    setInterval(() => {
      //# reset card
      this.mfrc522.reset();

      //# Scan for cards
      let response = this.mfrc522.findCard();
      if (!response.status) {
        return;
      }
      console.log("Card detected, CardType: " + response.bitSize);

      //# Get the UID of the card
      response = this.mfrc522.getUid();
      if (!response.status) {
        console.log("UID Scan Error");
        return;
      }
      //# If we have the UID, continue
      const uid = response.data;
      console.log(
        "Card read UID: %s %s %s %s",
        uid[0].toString(16),
        uid[1].toString(16),
        uid[2].toString(16),
        uid[3].toString(16)
      );
      const uidInt = uid.reduce((acc, id) => acc + parseInt(id.toString(10)));
      callback(uidInt);
    }, 500);
  }
}
