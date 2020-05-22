import React from "react";

import { TabsStore } from "./tabs";
import { AddressbarStore } from "./addressbar";
import { EventsStore } from "./events";

import { observable } from 'mobx';
import { ipcRenderer } from "electron";

class Dot {
    public tabs = new TabsStore(this);
    public addressbar = new AddressbarStore(this);
    public events = new EventsStore(this);

    @observable
    public isMaximised: boolean = false;

    @observable
    public debugMode: boolean = false;

    @observable
    public confettiMode: boolean = true;

    public searchRef = React.createRef<HTMLInputElement>()

    constructor() {
        window.addEventListener('DOMContentLoaded', () => {
            this.tabs.add({ url: "https://web.tabliss.io/", active: true })
        })
    }
}

export default new Dot();