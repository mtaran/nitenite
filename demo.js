var myCharacteristic;

function onStartButtonClick() {
  let serviceUuid = 'heart_rate'; // document.querySelector('#service').value;
  if (serviceUuid.startsWith('0x')) {
    serviceUuid = parseInt(serviceUuid);
  }

  let characteristicUuid = 'heart_rate_measurement'; // document.querySelector('#characteristic').value;
  if (characteristicUuid.startsWith('0x')) {
    characteristicUuid = parseInt(characteristicUuid);
  }

  console.log('Requesting Bluetooth Device...');
  navigator.bluetooth.requestDevice({filters: [{services: [serviceUuid]}]})
  .then(device => {
    console.log('Connecting to GATT Server...');
    return device.gatt.connect();
  })
  .then(server => {
    console.log('Getting Service...');
    return server.getPrimaryService(serviceUuid);
  })
  .then(service => {
    console.log('Getting Characteristic...');
    return service.getCharacteristic(characteristicUuid);
  })
  .then(characteristic => {
    myCharacteristic = characteristic;
    return myCharacteristic.startNotifications().then(_ => {
      console.log('> Notifications started');
      myCharacteristic.addEventListener('characteristicvaluechanged',
        handleNotifications);
    });
  })
  .catch(error => {
    console.log('Argh! ' + error);
  });
}

function onStopButtonClick() {
  if (myCharacteristic) {
    myCharacteristic.stopNotifications()
    .then(_ => {
      console.log('> Notifications stopped');
      myCharacteristic.removeEventListener('characteristicvaluechanged',
        handleNotifications);
    })
    .catch(error => {
      console.log('Argh! ' + error);
    });
  }
}

function handleNotifications(event) {
  let value = event.target.value;
  const {heartRate, rrIntervals} = parseHeartRate(value);
  console.log('> ' + JSON.stringify({
    time: Date.now(),
    heartRate,
    rrIntervals,
  }));
}

function isWebBluetoothEnabled() {
  if (navigator.bluetooth) {
    return true;
  } else {
    console.error('Web Bluetooth API is not available.\n' +
                            'Please make sure the Web Bluetooth flag is enabled.');
    return false;
  }
}

function parseHeartRate(data) {
  let flags = data.getUint8(0);
  let rate16Bits = flags & 0x1;
  let result = {};
  let index = 1;
  if (rate16Bits) {
    result.heartRate = data.getUint16(index, /*littleEndian=*/true);
    index += 2;
  } else {
    result.heartRate = data.getUint8(index);
    index += 1;
  }
  let contactDetected = flags & 0x2;
  let contactSensorPresent = flags & 0x4;
  if (contactSensorPresent) {
    result.contactDetected = !!contactDetected;
  }
  let energyPresent = flags & 0x8;
  if (energyPresent) {
    result.energyExpended = data.getUint16(index, /*littleEndian=*/true);
    index += 2;
  }
  let rrIntervalPresent = flags & 0x10;
  if (rrIntervalPresent) {
    let rrIntervals = [];
    for (; index + 1 < data.byteLength; index += 2) {
      rrIntervals.push(data.getUint16(index, /*littleEndian=*/true));
    }
    result.rrIntervals = rrIntervals;
  }
  return result;
}

document.querySelector('#startNotifications').addEventListener('click', event => {
    event.stopPropagation();
    event.preventDefault();

    if (isWebBluetoothEnabled()) {
      console.clear();
      onStartButtonClick();
    }
  });