import React from 'react';
import {createStyles, makeStyles, Theme} from '@material-ui/core/styles';
import {
    ListSubheader,
    Collapse,
    ListItemText,
    ListItemIcon,
    ListItem,
    List
} from '@material-ui/core';
import {ExpandLess, ExpandMore} from '@material-ui/icons';
import GroupIcon from '@material-ui/icons/Group';
import ViewModuleIcon from '@material-ui/icons/ViewModule';

const useStyles = makeStyles((theme: Theme) =>
    createStyles({
        root: {
            width: '100%',
            backgroundColor: theme.palette.background.default,
        },
        nested: {
            paddingLeft: theme.spacing(4),
        },
        onEmptyMessage: {
            textAlign: "center"
        }
    }),
);

export default function NestedList(props: NestedListProps) {
    const {title, items, collapsed = true} = props;
    const classes = useStyles();

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
            className={classes.root}>
            {
                items.length ?
                    ConstructItems(items, collapsed) :
                    <ListItem className={classes.onEmptyMessage}>
                        <ListItemText primary="No items"/>
                    </ListItem>
            }
        </List>
    );
}

function ConstructItems(items: NestedListItem[], collapsed: boolean) {
    return items.map((item, index) => (
        <Item key={index}
              item={item}
              collapsed={collapsed}/>
    ));
}

function Item(props: ItemProps) {
    const {item, collapsed} = props;
    const [open, setOpen] = React.useState(!collapsed);
    const {title, nestedItems} = item;

    const hasSubItems = nestedItems && nestedItems.length > 0; //(item.nestedItems ?? []).length > 0;

    return (
        <React.Fragment>
            <ListItem button onClick={() => setOpen(!open)}>
                <ListItemIcon>
                    <ViewModuleIcon/>
                </ListItemIcon>
                <ListItemText primary={title}/>
                {hasSubItems && (open ? <ExpandLess/> : <ExpandMore/>)}
            </ListItem>
            {
                nestedItems?.map((nestedItemTitle, index) =>
                    <NestedItem {...{index, open, nestedItemTitle}}/>)
            }
        </React.Fragment>
    );
}

function NestedItem({index, nestedItemTitle, open}: NestedItemProps) {
    const classes = useStyles();

    return (
        <Collapse key={index} in={open} timeout="auto" unmountOnExit>
            <List component="div" className={classes.nested} disablePadding>
                <ListItem button>
                    <ListItemIcon>
                        <GroupIcon/>
                    </ListItemIcon>
                    <ListItemText primary={nestedItemTitle}/>
                </ListItem>
            </List>
        </Collapse>
    );
}

export interface NestedListItem {
    title: string,
    nestedItems?: string[]
}

interface ItemsProps {
    items: NestedListItem[];
    collapsed?: boolean;
}

interface NestedListProps extends ItemsProps {
    title?: string;
}

interface ItemProps {
    item: NestedListItem;
    collapsed?: boolean;
}

interface NestedItemProps {
    index: number;
    nestedItemTitle: string;
    open: boolean;
}
