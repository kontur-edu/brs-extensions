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
import SubmitWithLoading from "./submitWithLoading";

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

export default function ({loading, onSubmit}: Props) {
    const classes = useStyles();

    const fetchData: DisciplinesFetchData = {
        course: 0,
        isModule: false,
        termType: "Осенний",
        year: 0
    };

    function handleChange(event: any) {
        const target = event.target;
        switch (target.name) {
            case 'year':
                fetchData.year = target.value as number;
                break;
            case 'term-type':
                fetchData.termType = target.value as ('Осенний' | 'Весенний');
                break;
            case 'course':
                fetchData.course = target.value as number;
                break;
            case 'is-module':
                fetchData.isModule = target.checked as boolean;
                break;
        }
    }

    function handleSubmit(e: any) {
        e.preventDefault();
        onSubmit(fetchData);
    }

    return (
        <form onSubmit={handleSubmit}>
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
    )
}

export interface DisciplinesFetchData {
    year: number;
    termType: 'Осенний' | 'Весенний';
    course: number;
    isModule: boolean;
}

interface Props {
    loading: boolean;
    onSubmit: (fetchData: DisciplinesFetchData) => void;
}
