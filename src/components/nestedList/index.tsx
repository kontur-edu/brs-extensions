import React from 'react';
import {Collapse, List, ListItem, ListItemIcon, ListItemText, ListSubheader} from '@material-ui/core';
import {ExpandLess, ExpandMore} from '@material-ui/icons';
import GroupIcon from '@material-ui/icons/Group';
import ViewModuleIcon from '@material-ui/icons/ViewModule';
import "./styles.css"

export default function NestedList(props: NestedListProps) {
    const {title, items, collapsed = true} = props;

    const listSubheader = (
        <ListSubheader component="div" id="nested-list-subheader" hidden={!title}>
            {title}
        </ListSubheader>
    );

    return (
        <List
            component="nav"
            aria-labelledby="nested-list-subheader"
            subheader={listSubheader}
            className={"nested-list primary"}>
            {
                items.length ?
                    ConstructItems(items, collapsed) :
                    <ListItem className={"text-align-center"}>
                        <ListItemText primary="No items"/>
                    </ListItem>
            }
        </List>
    );
}

function ConstructItems(items: INestedListItem[], collapsed: boolean) {
    return items.map((item, index) => (
        <Item key={index}
              item={item}
              collapsed={collapsed}/>
    ));
}

function Item({item, collapsed}: ItemProps) {
    const [open, setOpen] = React.useState(!collapsed);

    const {title, nestedItems} = item;

    const hasSubItems = nestedItems && nestedItems.length > 0;

    return (
        <React.Fragment>
            <ListItem button onClick={() => setOpen(!open)} className={"primary hover"}>
                <ListItemIcon>
                    <ViewModuleIcon/>
                </ListItemIcon>
                <ListItemText primary={title}/>
                {hasSubItems && (open ? <ExpandLess/> : <ExpandMore/>)}
            </ListItem>
            {
                nestedItems?.map((nestedItem, index) =>
                    <NestedItem {...{index, open, title: nestedItem.title, colored: nestedItem.colored}}/>)
            }
        </React.Fragment>
    );
}

function NestedItem({index, title, open, colored}: NestedItemProps) {
    const color = colored && "colored-back";

    return (
        <Collapse key={index} in={open} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
                <ListItem className={"nested-item " + color}>
                    <ListItemIcon>
                        <GroupIcon/>
                    </ListItemIcon>
                    <ListItemText primary={title}/>
                </ListItem>
            </List>
        </Collapse>
    );
}

export interface INestedListItem {
    title: string;
    nestedItems?: INestedItem[];
}

export interface INestedItem {
    title: string;
    colored?: boolean;
}

interface ItemsProps {
    items: INestedListItem[];
    collapsed?: boolean;
}

interface NestedListProps extends ItemsProps {
    title?: string;
}

interface ItemProps {
    item: INestedListItem;
    collapsed?: boolean;
}

interface NestedItemProps {
    index: number;
    title: string;
    open: boolean;
    colored?: boolean;
}
