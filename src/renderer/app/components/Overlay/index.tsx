import { observer } from 'mobx-react';
import * as React from 'react';

import store from '../../store';
import {
  StyledOverlay,
  HeaderText,
  HeaderArrow,
  Scrollable,
  Title,
  Content,
  Container,
  Image,
  Dot,
  Preloader,
  Panel,
} from './style';
import { SearchBox } from '../SearchBox';
import { TabGroups } from '../TabGroups';
import { WeatherCard } from '../WeatherCard';
import { History } from '../History';
import { Bookmarks } from '../Bookmarks';
import { AdBlock } from '../AdBlock';
import { Settings } from '../Settings';
import { LoginModal } from '../Login';
import { Extensions } from '../Extensions';
import { Preload } from '../Preload';
import { Dial } from '../Dial';
import { QuickMenu } from '../QuickMenu';
import { DownloadsSection } from '../DownloadsSection';
import { icons } from '../../constants';
import { Menu, MenuItem } from 'nersent-ui';
import { resolve } from 'path';
import { platform, homedir } from 'os';
const editJsonFile = require("edit-json-file");

import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import console = require('console');

// FCM Notifcation Handler
import { ipcRenderer } from 'electron';
const {
  START_NOTIFICATION_SERVICE,
  NOTIFICATION_SERVICE_STARTED,
  NOTIFICATION_SERVICE_ERROR,
  NOTIFICATION_RECEIVED,
  TOKEN_UPDATED,
} = require ('electron-push-receiver/src/constants')

// Listen for service successfully started
ipcRenderer.on(NOTIFICATION_SERVICE_STARTED, (_: any, token: any) => {
  console.log(`[FCMNS] The Firebase Cloud Messaging service has been launched using token ${token}`)
})

// Handle notification errors
ipcRenderer.on(NOTIFICATION_SERVICE_ERROR, (_: any, error: any) => {
  console.error(`[FCMNS] Notification error: ${error}`)
})

// Send FCM token to backend
ipcRenderer.on(TOKEN_UPDATED, (_: any, token: any) => {
  console.log(`[FCMNS] Token has been updated ${token}`)
})

// Display notification
ipcRenderer.on(NOTIFICATION_RECEIVED, (_: any, serverNotificationPayload: any) => {
  // check to see if payload contains a body string, if it doesn't consider it a silent push
  if (serverNotificationPayload.notification.body){
    // payload has a body, so show it to the user
    console.log(`[FCMNS] Recieved a notification from ${serverNotificationPayload.from}`, serverNotificationPayload)
    let myNotification = new Notification(serverNotificationPayload.notification.title, {
      body: serverNotificationPayload.notification.body
    })
    
    myNotification.onclick = () => {
      console.log('Notification clicked')
    }  
  } else {
    // payload has no body, so consider it silent (and just consider the data portion)
    console.log('do something with the key/value pairs in the data', serverNotificationPayload.data)
  }
})


store.downloads.load()

export const Header = ({ children, clickable }: any) => {
  return (
    <HeaderText clickable={clickable}>
      {children}
      {clickable && <HeaderArrow />}
    </HeaderText>
  );
};

const onClick = () => {
  if (store.tabGroups.currentGroup.tabs.length > 0) {
    store.overlay.visible = false;
  }
  store.overlay.dialTypeMenuVisible = false;
  store.user.menuVisible = false;
};

export const preventHiding = (e: any) => {
  e.stopPropagation();
  store.overlay.dialTypeMenuVisible = false;
  store.user.menuVisible = false;
  document.getElementById("search-engine-dp").style.opacity = "0";
  document.getElementById("search-engine-dp").style.pointerEvents = "none";
  store.bookmarks.menuVisible = false;
};

store.user.loadProfile()

export const Overlay = observer(() => {
  return (
    <StyledOverlay visible={store.overlay.visible} onClick={onClick}>
      <Preload/>
      <Container
        visible={
          store.overlay.currentContent === 'default' && store.overlay.visible
        }
      >
        <Scrollable ref={store.overlay.scrollRef} id="home">
          <Content>
            <Image src={icons.logo} center style={{ width: '250px' }}></Image>
            <SearchBox />
            <Dial />

            <Title>Overview</Title>
            <TabGroups />
            {store.downloads.list.length > 0 && <DownloadsSection />}
            <QuickMenu />
            <Title>World</Title>
            <WeatherCard />
          </Content>
        </Scrollable>
      </Container>
      <History />
      <Bookmarks />
      <Extensions />
      <Settings />
      <LoginModal />
      <AdBlock />
    </StyledOverlay>
  );
});

const senderId = '534960319282'
console.log("[FCMNS] Started service");
ipcRenderer.send(START_NOTIFICATION_SERVICE, senderId)
