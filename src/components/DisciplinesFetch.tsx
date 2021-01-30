import React, {FormEvent, memo} from "react";
import {
    createStyles,
    makeStyles,
    TextField,
    Collapse,
    MenuItem,
    Select,
    InputLabel,
    FormControl,
    FormControlLabel,
    Checkbox
} from "@material-ui/core";
import NestedList from "./NestedList";
import SubmitWithLoading from "./submitWithLoading";
import BrsApi, {Discipline, TermType} from "../apis/brsApi";
import {groupBy} from "../helpers/tools";

const useStyles = makeStyles(() =>
    createStyles({
        termType: {
            minWidth: 100,
            marginRight: 10
        },
        year: {
            width: 60,
            marginRight: 10
        },
        course: {
            width: 50,
            marginRight: 10
        },
        submit: {
            display: 'inline-block',
            top: 5
        },
        isModule: {
            marginTop: 15
        },
        header: {
            marginBottom: 10
        }
    }),
);

function DisciplinesFetch(props: Props) {
    const classes = useStyles();
    const {brsApi, onUnauthorized} = props;

    let year = 0;
    let termType: 'Осенний' | 'Весенний' = 'Осенний';
    let course = 0;
    let isModule = false;
    const [openDisciplines, setOpenDisciplines] = React.useState(false);
    const [loading, setLoading] = React.useState(false);

    let disciplinesEmpty: { title: string, nestedItems: string[] }[] = [];
    const [disciplines, setDisciplines] = React.useState(disciplinesEmpty);

    function handleChange(event: React.ChangeEvent<{ name?: string | undefined, value: unknown }>) {
        const target = event.target;
        switch (target.name) {
            case 'year':
                year = target.value as number;
                break;
            case 'term-type':
                termType = target.value as ('Осенний' | 'Весенний');
                break;
            case 'course':
                course = target.value as number;
                break;
            case 'is-module':
                // @ts-ignore
                isModule = target.checked as boolean;
                break;
        }
    }

    async function loadDisciplines(e: FormEvent) {
        e.preventDefault();
        setLoading(true);

        const term = termType === 'Осенний' ? TermType.Fall : TermType.Spring;

        let rawDisciplines;
        try {
            rawDisciplines = await brsApi.getDisciplineCachedAsync(year, term, course, isModule);
        } catch (e) {
            onUnauthorized();
            setLoading(false);
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
                nestedItems: d[1].map(x => x.group)
            }));
    }

    return (
        <React.Fragment>
            <h3 className={classes.header}>Выбери параметры курса в БРС</h3>
            <form onSubmit={loadDisciplines}>
                <TextField name="year"
                           className={classes.year}
                           label="Год"
                           type="number"
                           onChange={handleChange}
                           required/>
                <FormControl className={classes.termType} required>
                    <InputLabel id="term-label">Семестр</InputLabel>
                    <Select name="term-type"
                            onChange={handleChange}>
                        <MenuItem value="Осенний">Осенний</MenuItem>
                        <MenuItem value="Весенний">Весенний</MenuItem>
                    </Select>
                </FormControl>
                <TextField name="course"
                           className={classes.course}
                           label="Курс"
                           type="number"
                           onChange={handleChange}
                           required/>
                <FormControlLabel label="Модуль"
                                  className={classes.isModule}
                                  control={<Checkbox name="is-module"
                                                     color="primary"
                                                     onChange={handleChange}/>}/>
                <SubmitWithLoading title="вывести" loading={loading} className={classes.submit}/>
            </form>
            <br/>
            <Collapse in={openDisciplines}>
                <NestedList title="Доступные дисциплины" items={disciplines}/>
            </Collapse>
        </React.Fragment>
    );
}

export default memo(DisciplinesFetch);

interface Props {
    brsApi: BrsApi;
    onUnauthorized: () => void;
}
