import React, {memo} from "react";
import {Collapse, createStyles, makeStyles} from "@material-ui/core";
import NestedList, {NestedItem} from "../../nestedList";
import BrsApi, {Discipline, TermType} from "../../../apis/brsApi";
import {groupBy} from "../../../helpers/tools";
import DisciplinesFetchControls, {DisciplinesFetchData} from "./DisciplinesFetchControls";

const useStyles = makeStyles(() =>
    createStyles({
        header: {
            marginTop: 10,
            marginBottom: 10
        },
        disciplinesList: {
            marginTop: 25
        }
    }),
);

function DisciplinesFetch({brsApi, onError}: Props) {
    const classes = useStyles();

    const [openDisciplines, setOpenDisciplines] = React.useState(false);
    const [disciplines, setDisciplines] = React.useState([] as NestedItem[]);
    const [loading, setLoading] = React.useState(false);

    async function loadDisciplines(fetchData: DisciplinesFetchData) {
        setLoading(true);

        const termType = fetchData.termType === 'Осенний' ? TermType.Fall : TermType.Spring;
        const {year, course, isModule} = fetchData;
        let rawDisciplines: Discipline[];

        try {
            rawDisciplines = await brsApi.getDisciplineCachedAsync(year, termType, course, isModule);
        } catch (e) {
            setLoading(false);
            onError(e);
            return;
        }

        setDisciplines(convertToListItems(rawDisciplines));
        setLoading(false);
        setOpenDisciplines(true);
    }

    function convertToListItems(disciplines: Discipline[]) {
        return Object
            .entries(groupBy(disciplines, 'discipline'))
            .map(d => ({
                title: d[0],
                nestedItems: d[1].map(x => ({title: x.group}))
            }));
    }

    return (
        <React.Fragment>
            <h3 className={classes.header}>Выбери параметры курса в БРС</h3>
            <DisciplinesFetchControls loading={loading} onSubmit={loadDisciplines}/>
            <Collapse in={openDisciplines} className={classes.disciplinesList}>
                <NestedList title="Доступные дисциплины" items={disciplines}/>
            </Collapse>
        </React.Fragment>
    );
}

export default memo(DisciplinesFetch);

interface Props {
    brsApi: BrsApi;
    onError: (error: any) => void;
}
