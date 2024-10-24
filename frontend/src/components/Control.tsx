import * as React from 'react';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { Button, Checkbox, Chip, Divider, FormControlLabel, FormGroup } from '@mui/material';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`vertical-tabpanel-${index}`}
      aria-labelledby={`vertical-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `vertical-tab-${index}`,
    'aria-controls': `vertical-tabpanel-${index}`,
  };
}

export default function Control() {
  const [value, setValue] = React.useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box
      sx={{ bgcolor: 'background.paper', display: 'flex', width: "350px" }}
    >
      <Tabs
        orientation="vertical"
        variant="scrollable"
        value={value}
        onChange={handleChange}
        aria-label="Vertical tabs example"
        sx={{ borderRight: 1, borderColor: 'divider' }}
      >
        <Tab sx={{ textTransform: 'none' }} label="Robot Paras" {...a11yProps(0)} />
        <Tab sx={{ textTransform: 'none' }} label="UI Paras" {...a11yProps(1)} />
      </Tabs>
      <TabPanel value={value} index={0}>
        <Typography variant="subtitle2" gutterBottom>
          Select the items to be recycled
        </Typography>
        <FormGroup>
          <FormControlLabel control={<Checkbox />} label="Pet" />
          <FormControlLabel control={<Checkbox />} label="Clear Glass" />
          <FormControlLabel control={<Checkbox />} label="Brown Glass" />
          <FormControlLabel control={<Checkbox />} label="Other Glass" />
          <FormControlLabel control={<Checkbox />} label="Can" />
        </FormGroup>
        <Divider sx={{ my: 2 }} />
        <Button sx={{ textTransform: "none" }} variant="contained" color="success" size='large'>
          Start
        </Button>
      </TabPanel>
      <TabPanel value={value} index={1}>
        <Typography variant="subtitle2" gutterBottom>
          Select the items to be recycled
        </Typography>
        <FormGroup>
          <FormControlLabel control={<Checkbox />} label="Pet" />
          <FormControlLabel control={<Checkbox />} label="Clear Glass" />
          <FormControlLabel control={<Checkbox />} label="Brown Glass" />
          <FormControlLabel control={<Checkbox />} label="Other Glass" />
          <FormControlLabel control={<Checkbox />} label="Can" />
        </FormGroup>
        <Divider sx={{ my: 2 }} />
      </TabPanel>
    </Box>
  );
}