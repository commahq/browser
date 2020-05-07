import React from 'react';
import { StyledAddressbar, SearchIcon, Input, InputPlaceholder } from "./style"
import { Icon } from '../Icon';
import { observer } from 'mobx-react-lite';

import dot from '../../store'
import { ipcRenderer } from 'electron';

export const Addressbar = observer(() => {
    const [inputFocused, setInputFocused] = React.useState(true);
    const [placeholderVisible, setPlaceholderVisibility] = React.useState(true);

    const onSearchBlur = () => {
        window.getSelection().removeAllRanges()

        if(dot.searchRef.current.value.length == 0) {
            dot.searchRef.current.blur()
            setPlaceholderVisibility(true)
            setInputFocused(false)
        }
    }

    const onClick = () => {
        dot.searchRef.current.focus();
        dot.searchRef.current.select();
    }

    const onMouseDown = () => {
        if(dot.searchRef.current.value.length == 0) {
            setInputFocused(a => !a)
        }
    }

    const onInput = () => {
        if(dot.searchRef.current.value.length !== 0) {
            setPlaceholderVisibility(false)
        } else {
            setPlaceholderVisibility(true)
        }
    }

    const onKeyUp = (e) => {
        if(e.keyCode == 13) {
            const url = dot.searchRef.current.value;

            ipcRenderer.send('view-navigate', dot.tabs.selectedTab.id, url)

            dot.searchRef.current.blur();
        }
    }

    return (
        <StyledAddressbar>
            <SearchIcon focused={inputFocused}>
                <Icon icon={"search"} size={14} />
            </SearchIcon>
            <Input 
                placeholder={""} 
                ref={dot.searchRef} 
                onBlur={onSearchBlur} 
                onClick={onClick} 
                onMouseDown={onMouseDown}
                onInput={onInput}
                onKeyUp={(event) => onKeyUp(event)}
            />
            {placeholderVisible && <InputPlaceholder focused={inputFocused}>Search Google or type a URL</InputPlaceholder>}
        </StyledAddressbar>
    )
})