import React from 'react';
import {
    Checkbox,
    createStyles,
    FormControl,
    FormControlLabel,
    InputLabel,
    makeStyles,
    MenuItem,
    Select,
    TextField
} from "@material-ui/core";
import SubmitWithLoading from "../../shared/SubmitWithLoading";

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
    }),
);

export default function DisciplinesFetchControls({loading, onSubmit}: Props) {
    const classes = useStyles();

    const [course, setCourse] = React.useState(1);
    const [year, setYear] = React.useState(getDefaultYear());
    const [termType, setTermType] = React.useState(getDefaultTermType());
    const [isModule, setIsModule] = React.useState(false);

    function handleChange(event: any) {
        const target = event.target;
        switch (target.name) {
            case 'year':
                setYear(target.value as number);
                break;
            case 'term-type':
                setTermType(target.value as TermType);
                break;
            case 'course':
                setCourse(target.value as number);
                break;
            case 'is-module':
                setIsModule(target.checked as boolean);
                break;
        }
    }

    function handleSubmit(e: any) {
        e.preventDefault();
        onSubmit({course, year, isModule, termType});
    }

    return (
        <form onSubmit={handleSubmit}>
            <TextField name="year"
                       className={classes.year}
                       label="Год"
                       type="number"
                       value={year}
                       onChange={handleChange}
                       required/>
            <FormControl className={classes.termType} required>
                <InputLabel id="term-label">Семестр</InputLabel>
                <Select name="term-type"
                        value={termType}
                        onChange={handleChange}>
                    <MenuItem value="Осенний">Осенний</MenuItem>
                    <MenuItem value="Весенний">Весенний</MenuItem>
                </Select>
            </FormControl>
            <TextField name="course"
                       className={classes.course}
                       label="Курс"
                       type="number"
                       value={course}
                       onChange={handleChange}
                       required/>
            <FormControlLabel label="ИТС"
                              className={classes.isModule}
                              control={<Checkbox name="is-module"
                                                 color="primary"
                                                 value={isModule}
                                                 onChange={handleChange}/>}/>
            <SubmitWithLoading title="вывести" loading={loading} className={classes.submit}/>
        </form>
    )
}

function getDefaultYear(): number {
    const date = new Date();
    const month = date.getMonth() + 1;
    return month >= 9 ? date.getFullYear() : date.getFullYear() - 1;
}

function getDefaultTermType(): TermType {
    const date = new Date();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    return (
        month >= 9 ||              // September to December
        month === 1 ||             // January
        (month === 2 && day <= 7)) // Until February 7
        ? "Осенний"
        : "Весенний";
}

export interface DisciplinesFetchData {
    year: number;
    termType: TermType;
    course: number;
    isModule: boolean;
}

interface Props {
    loading: boolean;
    onSubmit: (fetchData: DisciplinesFetchData) => void;
}

type TermType = "Осенний" | "Весенний";
