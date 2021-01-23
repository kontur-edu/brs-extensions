import React from 'react';
import {createStyles, makeStyles, Theme} from '@material-ui/core/styles';
import ListSubheader from '@material-ui/core/ListSubheader';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import Collapse from '@material-ui/core/Collapse';
import ExpandLess from '@material-ui/icons/ExpandLess';
import ExpandMore from '@material-ui/icons/ExpandMore';
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

function NestedListItem(props: NestedListItemProps) {
    const {item, collapsed} = props;
    const [open, setOpen] = React.useState(!collapsed);
    const classes = useStyles();

    return (
        <React.Fragment>
            <ListItem button onClick={() => setOpen(!open)}>
                <ListItemIcon>
                    <ViewModuleIcon/>
                </ListItemIcon>
                <ListItemText primary={item.title}/>
                {item.nestedItems?.length && (open ? <ExpandLess/> : <ExpandMore/>) || undefined}
            </ListItem>
            {
                item.nestedItems?.length &&
                item.nestedItems.map((nestedItemTitle, index) => (
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
                ))
                || undefined
            }
        </React.Fragment>
    );
}

export default function NestedList(props: NestedListProps) {
    const {title, items, collapsed = true} = props;
    const classes = useStyles();
    return (
        <List
            component="nav"
            aria-labelledby="nested-list-subheader"
            subheader={
                <ListSubheader component="div" id="nested-list-subheader" hidden={!title}>
                    {title}
                </ListSubheader>
            }
            className={classes.root}>
            {
                items.length ?
                    items.map((item, index) => (
                        <NestedListItem key={index}
                                        item={item}
                                        collapsed={collapsed}/>
                    )) :
                    <ListItem className={classes.onEmptyMessage}>
                        <ListItemText primary="No items"/>
                    </ListItem>
            }
        </List>
    );
}

export interface NestedListItem {
    title: string,
    nestedItems?: string[]
}

interface NestedListProps {
    title?: string;
    items: NestedListItem[];
    collapsed?: boolean;
}

interface NestedListItemProps {
    item: { title: string, nestedItems?: string[] };
    collapsed?: boolean;
}
