import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useState } from 'react';
import init from 'react_native_mqtt';
import Dialog from "react-native-dialog";
import { Tooltip } from 'react-native-elements';
import { StyleSheet, View, AsyncStorage, Text, ScrollView } from 'react-native';

import { Piano } from 'react-native-piano';

init({
  size: 10000,
  storageBackend: AsyncStorage,
  defaultExpires: 1000 * 3600 * 24,
  enableCache: true,
  sync: {},
});

export default function App() {

  // Rango de sonido
  const rage = {
    first: 'c4',
    last: 'e5',
  }

  // Cliente mqtt
  const [client, setClient] = useState(new Paho.MQTT.Client('broker.emqx.io', 8084, 'LostMessage'));
  // Notas que se mostrarán en el piano
  const [globalNotes, setGlobalNotes] = useState([]);
  // Dialogo Visible
  const [isVisible, setVisible] = useState(false);
  // Nickname
  const [nickname, setNickname] = useState('');

  // Hook inicial, cuando se conecte la app, buscará los datos
  useEffect(() => {
    if(!client.isConnected()) {
      client.onConnectionLost = onConnectionLost;
      client.onMessageArrived = onMessageArrived;
      client.connect({ onSuccess: onConnect, useSSL: true });
      setVisible(true);
    }
    // Funcion de busqueda
    fetchGlobalNotes();
  }, []);

  // Se ejecuta si se pierde la conexión
  const onConnectionLost = responseObject => {
    if (responseObject.errorCode !== 0) {
      alert('Lose connection');
    }
  };

  // Se ejecuta si se recibe un mensaje del broker
  const onMessageArrived = (message) => {
    fetchGlobalNotes();
  }

  // Buscar notas al servidor
  const fetchGlobalNotes = () => {
    fetch('https://piano-server.herokuapp.com/notes')
    .then(res => res.json())
    .then(data => setGlobalNotes(data))
    .catch(e => console.log(e));
  }

  // Cuando se conecte el mqtt nos suscribimos
  const onConnect = () => {
    client.subscribe('IDKWhatImDoingHere');
    alert("Conexión establecida");
  };

  // Funcion para cerrar el input
  const closeModalInput = () => {
    if(nickname.length > 0) {
      setVisible(!isVisible);
    }
    else {
      alert("La longitud del nickname debe ser mayor a cero");
    }
  }

  // Cambios en el input del modal
  const handleNickname = (text) => {
    setNickname(text);
  }

  const checkNote = (e) => {

    const note = e.currentTarget._children[0]._children[0]._children[0]._children[0]._children[0]._children[0]._children[0]._internalFiberInstanceHandleDEV.memoizedProps.children.props.children;
  
    const index = note.indexOf("#"); 

    if (index !== -1) {
      note = note.replace("#", "S");
    }

    const json = JSON.stringify({
      note,
      name: nickname,
      date: new Date(),
      type: "tooltip"
    }); 

    const message = new Paho.MQTT.Message(json);
    message.destinationName = "IDKWhatImDoingHere";
    client.send(message);
  }

  // Función para cuando se deja de tocar la nota
  const onStopNoteInput = (note) => {}
  
  // Función que se ejecuta cuando se toca una nota
  const onPlayNoteInput = (note) => {

    const index = note.indexOf("#"); 

    if (index !== -1) {
      note = note.replace("#", "S");
    }

    const json = JSON.stringify({
      note,
      name: nickname,
      date: new Date(),
    }); 

    const message = new Paho.MQTT.Message(json);
    message.destinationName = "IDKWhatImDoingHere";
    client.send(message);
  }

  return (
    <>
      <Dialog.Container visible={isVisible}>
        <Dialog.Title>Elige tu nickname</Dialog.Title>
        <Dialog.Description>
          Nada grosero a menos que seas admin porfa.
        </Dialog.Description>
        <Dialog.Input onChangeText={ handleNickname }/>
        <Dialog.Button label="Ok" onPress={ closeModalInput }/>
      </Dialog.Container>
      <View style={styles.container}>
        <ScrollView contentContainerStyle={styles.notes} horizontal={true}>
          {
            globalNotes.map((some, index) => (
              <Tooltip key={index} popover={<Text>{ some.name }</Text>} onOpen={checkNote}>
                <View style={styles.noteContainer}>
                  <Text>
                    { some.note }
                  </Text>
                </View>
              </Tooltip>
            ))
          }
        </ScrollView>
        <Piano 
          noteRange={rage} 
          onPlayNoteInput={onPlayNoteInput}
          onStopNoteInput={onStopNoteInput}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-start',
    backgroundColor: '#fafafa',
  },
  notes: {
    height: '100%',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  noteContainer: {
    padding: 20,
    marginLeft: 10,
    borderRadius: 20,
    backgroundColor: '#64b5f6'
  }
});
