import React from "react";
import "./styles.css";
import {
  Collapse,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListSubheader,
} from "@material-ui/core";
import { ExpandLess, ExpandMore } from "@material-ui/icons";

export default function NestedList(props: NestedListProps) {
  const { title, items, icons } = props;

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
      className="nested-list primary"
    >
      {items.length ? renderNestedItems(items, 0, icons) : renderEmpty()}
    </List>
  );
}

function renderNestedItems(
  items: NestedItem[],
  level: number,
  icons?: (JSX.Element | null)[]
) {
  return items.map((item, index) => (
    <NestedListItem key={index} item={item} icons={icons} level={level} />
  ));
}

function renderEmpty() {
  return (
    <ListItem className="text-align-center">
      <ListItemText primary="..." />
    </ListItem>
  );
}

function NestedListItem({ item, level, icons }: NestedListItemProps) {
  const { title, nestedItems, colored, collapsed } = item;

  const [open, setOpen] = React.useState(!collapsed);

  const hasSubItems = nestedItems && nestedItems.length > 0;

  const color = colored && "colored-back";

  const icon = icons && icons[level];
  const IconPlace = icon && <ListItemIcon>{icon}</ListItemIcon>;

  return (
    <React.Fragment>
      <ListItem
        button
        onClick={() => setOpen(!open)}
        style={level ? { paddingLeft: 40 * level } : undefined}
        className={"hover " + color}
      >
        {IconPlace}
        <ListItemText primary={title} />
        {hasSubItems && (open ? <ExpandLess /> : <ExpandMore />)}
      </ListItem>
      {hasSubItems && (
        <Collapse in={open} unmountOnExit>
          <List component="div" disablePadding>
            {nestedItems && renderNestedItems(nestedItems, level + 1, icons)}
          </List>
        </Collapse>
      )}
    </React.Fragment>
  );
}

export interface NestedItem {
  title: string;
  colored?: boolean;
  collapsed?: boolean;
  nestedItems?: NestedItem[];
}

interface NestedListProps {
  items: NestedItem[];
  title?: string;
  icons?: (JSX.Element | null)[];
}

interface NestedListItemProps {
  item: NestedItem;
  level: number;
  icons?: (JSX.Element | null)[];
}
