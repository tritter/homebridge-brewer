export default class MachineUDID {
    static services = {
      command: '06aa1910f22a11e39daa0002a5d5c51b',
      auth: '06aa1920f22a11e39daa0002a5d5c51b',
    };

    static characteristics = {
      auth: '06aa3a41f22a11e39daa0002a5d5c51b',
      status:'06aa3a12f22a11e39daa0002a5d5c51b',
      request: '06aa3a42f22a11e39daa0002a5d5c51b',
      response: '06aa3a52f22a11e39daa0002a5d5c51b',
      slider: '06aa3a22f22a11e39daa0002a5d5c51b',
      capsules: '06aa3a15f22a11e39daa0002a5d5c51b',
    };
}