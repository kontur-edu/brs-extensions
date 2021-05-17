import React from 'react';
import {Collapse, List, ListItem, ListItemIcon, ListItemText, ListSubheader, SvgIcon} from '@material-ui/core';
import {ExpandLess, ExpandMore} from '@material-ui/icons';
import "./styles.css"

export default function NestedList(props: NestedListProps) {
    const {title, items, icons} = props;

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
                    ConstructItems(items, 0, icons) :
                    <ListItem className={"text-align-center"}>
                        <ListItemText primary="No items"/>
                    </ListItem>
            }
        </List>
    );
}

function ConstructItems(items: INestedListItem[], level: number, icons?: typeof SvgIcon[]) {
    return items.map((item, index) => (
        <NestedListItem key={index}
                        item={item}
                        icons={icons}
                        level={level}/>
    ));
}

function NestedListItem({item, level, icons}: NestedListItemProps) {
    const {title, nestedItems, colored, collapsed} = item;

    const [open, setOpen] = React.useState(!collapsed);

    const hasSubItems = nestedItems && nestedItems.length > 0;

    const color = colored && "colored-back";

    const icon = icons && icons[level];
    const IconPlace = icon && <ListItemIcon>{icon}</ListItemIcon>;

    return (
        <React.Fragment>
            <ListItem button
                      onClick={() => setOpen(!open)}
                      style={level ? {paddingLeft: 40 * level} : undefined}
                      className={"hover " + color}>
                {IconPlace}
                <ListItemText primary={title}/>
                {hasSubItems && (open ? <ExpandLess/> : <ExpandMore/>)}
            </ListItem>
            {
                hasSubItems &&
                <Collapse in={open} unmountOnExit>
                    <List component="div" disablePadding>
                        {nestedItems && ConstructItems(nestedItems, level + 1, icons)}
                    </List>
                </Collapse>
            }
        </React.Fragment>
    );
}

export interface INestedListItem {
    title: string;
    colored?: boolean;
    collapsed?: boolean;
    nestedItems?: INestedListItem[];
}

interface NestedListProps {
    items: INestedListItem[];
    title?: string;
    icons?: typeof SvgIcon[];
}

interface NestedListItemProps {
    item: INestedListItem;
    level: number;
    icons?: typeof SvgIcon[];
}
