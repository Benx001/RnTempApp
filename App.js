/**
 * React Native App to show the temperature from TC74 temperature sensor connected to a raspberry pi pico
 * https://github.com/Benx001/RnTempApp
 * For the raspberry pi pico https://github.com/Benx001/TempSensor
 * 
 * dependencies:
 * npm install react-native-svg
 * npx react-native link react-native-svg
 * npm install --force react-native-serialport
 * npx react-native link react-native-serialport
 *
 * @format
 * @flow strict-local
 */

import React, { useEffect, useRef, useState } from 'react';
import type { Node } from 'react';
import { RNSerialport, definitions, actions } from "react-native-serialport";
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  DeviceEventEmitter,
  FlatList
} from 'react-native';

import {
  Colors
} from 'react-native/Libraries/NewAppScreen';

import Svg, { Path, Circle, G, Text as SvgText } from 'react-native-svg';
import axios from 'react-native-axios';

function Header() {
  return (
    <Text style={styles.appHeader}>Temperature Sensor</Text>
  );
}

function YLegendP() {
  var yrow = [];
  for (var i = 13; i > -1; i--) {
    yrow.push(<G key={i} transform={`translate(5,${280 - (i * 20)})`}><SvgText fill="yellow" fontSize={8}>{i * 10}</SvgText></G>)
  }
  return (
    yrow
  )
}

function YLegendN() {
  var yrow = [];
  for (var i = 1; i < 5; i++) {
    yrow.push(<G key={i} transform={`translate(5,${280 + (i * 20)})`}><SvgText fill="yellow" fontSize={8}>-{i * 10}</SvgText></G>)
  }
  return (
    yrow
  )
}

function XLegendP(props) {
  var xrow = [];
  if (typeof props != 'undefined') {
    if (typeof props.dates != 'undefined') {
      if (props.dates.length > 0) {
        for (let i = 0, l = props.dates.length; i < l; i++) {
          xrow.push(<G key={i} transform={`translate(${props.dates[i].x},280) rotate(45)`}><SvgText fill='yellow' fontSize={8}>{((new Date(props.dates[i].date)).toLocaleString())}</SvgText></G>)
        }
      }
    }
  }
  return (
    xrow
  )
}

const TempGraph = (props) => {
  return (
    <View>
      <Svg
        height={380}
        width={400}
        className="graphsvg"
        {...props}
      >
        <SvgText fontSize="15" x={props.x + 4} y={props.y} fill="yellow">{props.temp}°C</SvgText>
        <Circle cx={props.x} cy={props.y} r={3} stroke="#000" fill="red" />
        <YLegendP></YLegendP>
        <YLegendN></YLegendN>
        <XLegendP dates={props.dates}></XLegendP>
        <Path
          stroke="purple"
          strokeWidth={1}
          fill='none'
          d={`M 10,280 h 340 M 20,270 h 3 M 20,260 h 8 M 20,250 h 3 M 20,240 h 8 M 20,230 h 3 M 20,220 h 8 M 20,210 h 3 M 20,200 h 8 M 20,190 h 3 M 20,180 h 8 M 20,170 h 3 M 20,160 h 8 M 20,150 h 3 M 20,140 h 8 M 20,130 h 3 M 20,120 h 8 M 20,110 h 3 M 20,100 h 8 M 20,90 h 3 M 20,80 h 8 M 20,70 h 3 M 20,60 h 8 M 20,50 h 3 M 20,40 h 8 M 20,30 h 3 M 20,20 h 8 M 20,10 h 3
          M 20,290 h 3 M 20,300 h 8 M 20,310 h 3 M 20,320 h 8 M 20,330 h 3 M 20,340 h 8 M 20,350 h 3 M 20,360 h 8 M 20,370 h 3`}
        />
        <Path
          stroke="orange"
          strokeWidth={1}
          fill='none'
          d={`${props.coord}`}
        />
      </Svg>
    </View>
  );
};

const TempConvertion = (props) => {
  const [ct, onChangeCt] = useState("1");
  const [ft, onChangeFt] = useState("2");

  const calcF = (objF) => {
    onChangeFt(objF);
  };

  const calcC = (objC) => {
    onChangeCt(objC);
  };

  return (
    <View style={styles.box}>
      <Text style={styles.title}>Temperature Conversion</Text>
      <Text style={styles.text}>°C </Text>
      <TextInput keyboardType='decimal-pad' style={styles.inputText} value={ct} onChangeText={(previousCt) => { calcF(((previousCt * 1.8) + 32).toString()); onChangeCt(previousCt); }}></TextInput>
      <Text style={styles.text}>°F </Text>
      <TextInput keyboardType='decimal-pad' style={styles.inputText} value={ft} onChangeText={(previousFt) => { calcC(((previousFt - 32) * 0.5556).toString()); onChangeFt(previousFt); }}></TextInput>
    </View>
  );
}

const TempRecords = (props) => {
  const [recs, onChangeRecs] = useState([]);
  const [searchrecs, onChangeSearchrecs] = useState([]);
  const [coord, onChangeCoord] = useState("");
  const [x, onChangeX] = useState(20);
  const [y, onChangeY] = useState(280);
  const [temp, onChangeTemp] = useState(0);
  const [recordsintable, onChangeRecordsintable] = useState([]);
  const [datesintable, onChangeDatesintable] = useState([]);
  const [dates, onChangeDates] = useState([]);
  const [schtxt, onChangeSchtxt] = useState("");
  const [showTempDataGraph, onChangeShowTempDataGraph] = useState(false);

  useEffect(() => { searchRecord() }, [recs]);

  const getTempData = async () => {
    const res = await axios.get('http://192.168.50.10:4999/getTemp');
    onChangeRecs(res.data);
    //searchRecord();
  }

  const viewTempData = () => {
    if (recordsintable.length > 0) {
      var coords = "";
      var xs = 20;
      var ys = 280;
      var temps = 0;
      var dates = [];
      for (let i = 0, l = 319; i < l; i++) {
        var thetemp = recordsintable[parseInt(i * ((recordsintable.length - 1) / (l - 1)))];
        coords = (xs == 20 ? `M 20,${280 - thetemp * 2}` : coords + ' L ' + xs + ',' + (280 - thetemp * 2));
        xs = xs + 1;
        ys = (280 - thetemp * 2);
        temps = thetemp;
        if (i % 42 == 0) {
          dates.push({ x: xs, date: datesintable[parseInt(i * ((datesintable.length - 1) / (l - 1)))] });
        }
      }

      onChangeCoord(coords);
      onChangeX(xs);
      onChangeY(ys);
      onChangeTemp(thetemp);
      onChangeDates(dates);

      onChangeShowTempDataGraph(true);
    } else {
      onChangeShowTempDataGraph(false);
    }
  }

  const deleteTemp = async (theid) => {
    const res = await axios.delete(`http://192.168.50.10:4999/deleteTemp`, { data: { id: theid }, headers: { Authorization: "***" } });
    getTempData();
  }

  const updateTemp = async (dt) => {
    const res = await axios.post(`http://192.168.50.10:4999/updateTemp`, { id: dt._id, the_temp: dt.the_temp });
  }

  const TempTable = (props) => {
    const flatListRef = useRef();
    return (
      <FlatList
      ref={flatListRef}
        showsVerticalScrollIndicator={true}
        data={props.data}
        renderItem={({ item }) => (
          <View
            style={{
              flexDirection: 'row',
              padding: 16,
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
            }}>
            <Text
              style={{
                color: 'white',
                fontSize: 15,
                paddingRight: 15,
                flex: 2
              }}>{`${(new Date(item.the_date)).toLocaleString()}`}</Text>
            <TextInput
              keyboardType='decimal-pad'
              key={item._id}
              style={[styles.inputText, { flex: 0.5 }]}
              defaultValue={item.the_temp.toString()}
              onChangeText={(newValue) => { updateTemp({ "_id": item._id, "the_date": item.the_date, "the_temp": newValue }) }}></TextInput>
            <Button action={() => { deleteTemp(item._id) }} text="Delete" style={{ fontSize: 20, color: '#FFFFFF', alignItems: 'center', textAlignVertical: 'center' }} touchablestyle={[styles.line2, styles.button2]}></Button>
          </View>
        )}
        keyExtractor={item => item._id}
      />
    )
  }

  const searchRecord = () => {
    var input = schtxt.toUpperCase();
    var tempvalues = [], schrecs = [], tempdates = [];
    if (input.length == 0) {
      schrecs = [...recs];
      for (let i = 0, l = recs.length; i < l; i++) {
        tempvalues.push(recs[i].the_temp);
        tempdates.push(recs[i].the_date);
      }
      onChangeRecordsintable(tempvalues.reverse());
      onChangeSearchrecs(schrecs);
      onChangeDatesintable(tempdates.reverse());
      return;
    }
    for (let i = 0, l = recs.length; i < l; i++) {
      if ((new Date(recs[i].the_date)).toLocaleString().indexOf(input) > -1 || (recs[i].the_temp).toString().indexOf(input) > -1) {
        tempvalues.push(recs[i].the_temp);
        schrecs.push(recs[i]);
        tempdates.push(recs[i].the_date);
      }
    }
    onChangeRecordsintable(tempvalues.reverse());
    onChangeSearchrecs(schrecs);
    onChangeDatesintable(tempdates.reverse());

  }

  useEffect(() => { searchRecord() }, [schtxt]);

  return (
    <View style={{ flex: 1 }}>
      <View style={[{ flex: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 40 }, styles.box]}>
        <View style={[styles.wrapper, { flex: 1, flexDirection: 'row' }]}>
          <Button action={getTempData} text="Get Records" style={{ fontSize: 15 }} touchablestyle={[styles.line2, styles.button2]}></Button>
          <TextInput keyboardType='ascii-capable' id="searchtemp" style={{ fontSize: 15, color: 'white', backgroundColor: '#181818', marginTop: 5, height: 30, padding: 0, width: '33%', textAlign: 'center' }} value={schtxt} onChangeText={newSch => { onChangeSchtxt(newSch); }} placeholder="Search for date or temp." title="Type in a date or temp."></TextInput>
          <Button action={viewTempData} text="View Records" style={{ fontSize: 15 }} touchablestyle={[styles.line2, styles.button2]}></Button>
        </View>
      </View>
      <TempTable data={searchrecs} style={{ flex: 1, marginTop: 20 }}></TempTable>
      <ScrollView>
        {showTempDataGraph && <TempGraph coord={coord} x={x} y={y} temp={temp} dates={dates} style={[styles.viewrecs, { flex: 0.5 }]} ></TempGraph>}
      </ScrollView>
    </View>
  )
}

const Button = (props) => {
  return (
    <View >
      <TouchableOpacity style={props.touchablestyle}
        onPress={() => props.action()}
      >
        <Text style={props.style}>{props.text}</Text>
      </TouchableOpacity>
    </View>
  );
}

const App: () => Node = () => {
  const [coord, onChangeCoord] = useState("");
  const [x, onChangeX] = useState(20);
  const [y, onChangeY] = useState(280);
  const [temp, onChangeTemp] = useState(0);

  const backgroundStyle = {
    backgroundColor: Colors.darker,
    flex: 1
  };
  const onUsbNotSupported = () => { alert('Usb not supported') }
  const onReadData = (data) => {
    var thetemp = 0;
    try {
      thetemp = parseInt(data.payload, 16);
    } catch (e) {
    }
    if (Number.isNaN(thetemp)) {
      return;
    }
    if (thetemp > 140) {
      return;
    }

    thetemp = thetemp > 127 ? (257 + ~thetemp) * (-1) : thetemp;

    axios.post(`http://192.168.50.10:4999/addTemp`, {
      temp: thetemp
    });

    onChangeX((x) => {
      let xx = x < 340 ? x + 1 : 21;
      onChangeCoord((coord) => { return xx < 340 ? (xx == 21 ? `M 20,${280 - thetemp * 2}` : coord + ' L ' + xx + ',' + (280 - thetemp * 2)) : `M 20,${280 - thetemp * 2}` });
      return xx;
    });

    onChangeY(280 - thetemp * 2);
    onChangeTemp(thetemp);
  }

  const connectSerialPort = () => {
    DeviceEventEmitter.addListener(actions.ON_DEVICE_NOT_SUPPORTED, onUsbNotSupported, this);
    DeviceEventEmitter.addListener(actions.ON_READ_DATA, onReadData, this);
    RNSerialport.setInterface(-1);
    RNSerialport.setReturnedDataType(definitions.RETURNED_DATA_TYPES.INTARRAY);
    RNSerialport.setReturnedDataType(definitions.RETURNED_DATA_TYPES.HEXSTRING);

    RNSerialport.setAutoConnectBaudRate(115200)
    RNSerialport.setAutoConnect(true)
    RNSerialport.startUsbService()
  }

  const disconnectSerial = async () => {
    DeviceEventEmitter.removeAllListeners();
    const isOpen = await RNSerialport.isOpen();
    if (isOpen) {
      RNSerialport.disconnect();
    }
    RNSerialport.stopUsbService();
  }

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar barStyle='light-content' />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}>
        <Header />
        <TempGraph coord={coord} x={x} y={y} temp={temp} />
        <Button action={connectSerialPort} style={styles.buttonText} touchablestyle={[styles.line2, styles.button]}
          text="Open Port"></Button>
        <Button action={disconnectSerial} style={styles.buttonText} touchablestyle={[styles.line2, styles.button]}
          text="Disconnect Port"></Button>
        <TempConvertion></TempConvertion>
      </ScrollView>
      <TempRecords style={{ flex: 1 }}></TempRecords>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  line2: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  button: {
    marginTop: 5,
    marginBottom: 5,
    paddingLeft: 15,
    paddingRight: 15,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#147efb",
    borderRadius: 3
  },
  button2: {
    marginTop: 3,
    marginBottom: 3,
    paddingLeft: 5,
    paddingRight: 5,
    height: 30,
    justifyContent: "space-evenly",
    alignItems: "center",
    backgroundColor: "#147efb",
    borderRadius: 3,
  },
  buttonText: {
    color: "#FFFFFF",
    textAlign: 'center',
    textAlignVertical: 'center',
    fontSize: 20
  },
  appHeader: {
    backgroundColor: "#282c34",
    minHeight: 10,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    textAlign: 'center',
    fontSize: 20,
    color: "white"
  },
  title: {
    backgroundColor: "#282c34",
    minHeight: 10,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    textAlign: 'center',
    fontSize: 20,
    color: "white",
    marginTop: 10
  },
  inputText: {
    backgroundColor: "#181818",
    fontSize: 20,
    color: "white"
  },
  text: {
    fontSize: 18,
    color: "white",
  },
  wrapper: {
    position: "relative"
  },
  box: {
    display: "flex",
    flexDirection: "column",
    width: "100%"
  }
});

export default App;
