import './ABIMethodExecutor.scss';
import React, {useEffect, useState} from "react";
import {
    ABIMethod,
    ABIMethodParams, abiTypeIsTransaction, TransactionType
} from "algosdk";
import {
    Button, ButtonGroup,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle, FormLabel,
    Grid, InputBase, InputBaseProps, styled
} from "@mui/material";
import OfflineBoltIcon from '@mui/icons-material/OfflineBolt';
import {theme} from "../../../../theme";
import {useDispatch, useSelector} from "react-redux";
import ABIConfig from "../../../../packages/abi/classes/ABIConfig";
import {showSnack} from "../../../../redux/common/actions/snackbar";
import {handleException} from "../../../../redux/common/actions/exception";
import ABIMethodExecutorCls from "../../../../packages/abi/classes/ABIMethodExecutor";
import {A_ABI_METHOD_EXECUTOR_APP_CREATION_PARAMS, A_ABI_METHOD_EXECUTOR_ARG} from "../../../../packages/abi/types";
import CloseIcon from "@mui/icons-material/Close";
import {RootState} from "../../../../redux/store";
import dappflow from "../../../../utils/dappflow";
import {hideLoader, showLoader} from "../../../../redux/common/actions/loader";
import {TransactionClient} from "../../../../packages/core-sdk/clients/transactionClient";
import {BaseTransaction} from "../../../../packages/core-sdk/transactions/baseTransaction";
import {FileUploadOutlined} from "@mui/icons-material";
import {CompileResponse} from "algosdk/dist/types/src/client/v2/algod/models/types";
import {getFileContent} from "../../../../packages/core-sdk/utils/fileUtils";
import {ApplicationClient} from "../../../../packages/core-sdk/clients/applicationClient";
import {CoreTransaction} from "../../../../packages/core-sdk/classes/core/CoreTransaction";


const ShadedInput = styled(InputBase)<InputBaseProps>(({ theme }) => {
    return {
        padding: 5,
        paddingLeft: 10,
        marginTop: 5,
        fontSize: 14,
        border: '1px solid ' + theme.palette.grey[200]
    };
});

interface ABIMethodExecutorProps{
    show: boolean,
    method: ABIMethodParams,
    handleClose?: Function
}

const defaultProps: ABIMethodExecutorProps = {
    show: false,
    method: {
        args: [],
        name: '',
        returns: {
            type: '',
            desc: '',
        },
        desc: ''
    }
};

interface ABIMethodExecutorState{
    appId: string,
    executorArgs: A_ABI_METHOD_EXECUTOR_ARG[],
    creation: boolean,
    creationParams: A_ABI_METHOD_EXECUTOR_APP_CREATION_PARAMS
}

const initialState: ABIMethodExecutorState = {
    appId: '',
    executorArgs: [],
    creation: false,
    creationParams: {
        id: '',
        approvalProgram: '',
        clearProgram: '',
        globalBytes: '',
        localBytes: '',
        globalInts: '',
        localInts: '',
        note: ''
    },
};

const formLabelSx = {
    marginLeft: '5px',
    fontSize: '13px',
    fontWeight: 'bold',
    color: theme.palette.grey[600]
};

const argTransactionSx = {
    background: theme.palette.common.white.toString()
};

function ABIMethodExecutor({show = defaultProps.show, method = defaultProps.method, handleClose}: ABIMethodExecutorProps): JSX.Element {

    const wallet = useSelector((state: RootState) => state.wallet);
    const dispatch = useDispatch();
    const [
        {appId, executorArgs, creation, creationParams},
        setState
    ] = useState({
        ...initialState
    });


    const abiMethodInstance = new ABIMethod(method);
    const args = abiMethodInstance.args;


    const clearState = () => {
        setState({ ...initialState });
    };

    useEffect(() => {
        const processedArgs: A_ABI_METHOD_EXECUTOR_ARG[] = [];
        args.forEach((arg) => {
            processedArgs.push({
                ...arg,
                value: ''
            });
        });
        setState(prevState => ({...prevState, executorArgs: processedArgs, appId: new ABIConfig().getAppId()}));
    }, [show]);



    function onClose(ev) {
        handleClose();
        clearState();
        ev.preventDefault();
        ev.stopPropagation();
    }

    async function execute() {

        try {
            dispatch(showLoader('Signing transaction'));
            const abiMethodExecutorInstance = new ABIMethodExecutorCls(method);
            const unsignedTxns = await abiMethodExecutorInstance.getUnsignedTxns(appId ? Number(appId) : undefined, wallet.information.address, executorArgs, creation, creationParams);

            const signedTxns = await dappflow.signer.signGroupTxns(unsignedTxns.map((unsignedTxn) => {
                return unsignedTxn.txn;
            }));
            dispatch(hideLoader());

            const txnInstance = new BaseTransaction(dappflow.network);
            dispatch(showLoader('Broadcasting transaction to network'));
            const {txId} = await txnInstance.send(signedTxns);
            dispatch(hideLoader());

            dispatch(showLoader('Waiting for confirmation'));
            await txnInstance.waitForConfirmation(txId);
            const txn = await new TransactionClient(dappflow.network).get(txId);
            dispatch(hideLoader());

            handleClose();
            clearState();

            if (creation) {
                const txnInstance = new CoreTransaction(txn);
                new ABIConfig().setAppId(txnInstance.getAppId().toString());
            }

            dispatch(showSnack({
                severity: 'success',
                message: 'Method executed successfully: ' + txId
            }));
        }
        catch (e: any) {
            dispatch(hideLoader());
            dispatch(handleException(e));
        }
    }

    async function validateProgram(event): Promise<CompileResponse> {
        let file = event.target.files[0];
        const target = event.target;

        try {
            dispatch(showLoader('Reading TEAL program'));
            const content = await getFileContent(file);
            dispatch(hideLoader());

            dispatch(showLoader('Compiling program'));
            const compileResp = await new ApplicationClient(dappflow.network).compileProgram(content);
            dispatch(hideLoader());

            target.value = null;
            return compileResp;
        }
        catch (e: any) {
            dispatch(hideLoader());
            dispatch(handleException(e));
        }
    }

    return (<div className={"abi-method-executor-wrapper"}>
        <div className={"abi-method-executor-container"}>

            {show ? <Dialog
                onClose={onClose}
                fullWidth={true}
                maxWidth={"md"}
                open={show}

                PaperProps={{
                    sx: {
                        height: '80vh'
                    }
                }}
            >
                <DialogTitle >
                    <div style={{display: 'flex', justifyContent: 'space-between'}}>
                        <div>
                            <div style={{fontWeight: "bold", fontSize: 18}}>Execute ABI Method</div>
                        </div>
                        <div>
                            <CloseIcon className="modal-close-button" onClick={onClose}/>
                        </div>

                    </div>
                </DialogTitle>
                <DialogContent>
                    <div className="abi-method-executor-modal-content">
                        <div className="abi-method-executor-header">
                            <div className="abi-method-name">
                                {abiMethodInstance.name}
                            </div>
                        </div>
                        <div className="abi-method-executor-body">

                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6} md={7} lg={7} xl={7}>
                                    <div className="abi-method-executor-panel-wrapper">
                                        <div className="abi-method-executor-panel-container">
                                            <div className="abi-method-metadata">
                                                {appId ? <div className="metadata-item">
                                                    Application ID : {appId}
                                                </div> : ''}
                                            </div>
                                            <div className="abi-method-app-creation-wrapper">
                                                <div className="abi-method-app-creation-container">
                                                    <div className="abi-method-app-creation-question">
                                                        Do you want to use this method for app creation ?
                                                    </div>

                                                    <ButtonGroup color={"warning"} variant="outlined" size={"small"} style={{marginTop: 20}}>
                                                        <Button variant={creation ? 'contained' : 'outlined'} onClick={() => {setState(prevState => ({...prevState, creation: true}));}}>Yes</Button>
                                                        <Button variant={!creation ? 'contained' : 'outlined'} onClick={() => {setState(prevState => ({...prevState, creation: false}));}}>No</Button>
                                                    </ButtonGroup>

                                                    {creation ? <div className="abi-method-app-creation-form">
                                                        <div className="abi-method-app-creation-form-content">
                                                            <div>
                                                                <Grid container spacing={2}>
                                                                    <Grid item xs={12} sm={12} md={6} lg={6} xl={6}>
                                                                        <FormLabel sx={formLabelSx}>Global bytes</FormLabel>
                                                                        <ShadedInput
                                                                            value={creationParams.globalBytes}
                                                                            placeholder="20"
                                                                            onChange={(ev) => {
                                                                                setState(prevState => ({...prevState, creationParams: {
                                                                                        ...creationParams,
                                                                                        globalBytes: ev.target.value
                                                                                    }}));
                                                                            }
                                                                            }
                                                                            fullWidth/>
                                                                    </Grid>
                                                                    <Grid item xs={12} sm={12} md={6} lg={6} xl={6}>
                                                                        <FormLabel sx={formLabelSx}>Global ints</FormLabel>
                                                                        <ShadedInput
                                                                            value={creationParams.globalInts}
                                                                            placeholder="20"
                                                                            onChange={(ev) => {
                                                                                setState(prevState => ({...prevState, creationParams: {
                                                                                        ...creationParams,
                                                                                        globalInts: ev.target.value
                                                                                    }}));
                                                                            }
                                                                            }
                                                                            fullWidth/>
                                                                    </Grid>
                                                                    <Grid item xs={12} sm={12} md={6} lg={6} xl={6}>
                                                                        <FormLabel sx={formLabelSx}>Local bytes</FormLabel>
                                                                        <ShadedInput
                                                                            value={creationParams.localBytes}
                                                                            placeholder="10"
                                                                            onChange={(ev) => {
                                                                                setState(prevState => ({...prevState, creationParams: {
                                                                                        ...creationParams,
                                                                                        localBytes: ev.target.value
                                                                                    }}));
                                                                            }
                                                                            }
                                                                            fullWidth/>
                                                                    </Grid>
                                                                    <Grid item xs={12} sm={12} md={6} lg={6} xl={6}>
                                                                        <FormLabel sx={formLabelSx}>Local ints</FormLabel>
                                                                        <ShadedInput
                                                                            value={creationParams.localInts}
                                                                            placeholder="10"
                                                                            onChange={(ev) => {
                                                                                setState(prevState => ({...prevState, creationParams: {
                                                                                        ...creationParams,
                                                                                        localInts: ev.target.value
                                                                                    }}));
                                                                            }
                                                                            }
                                                                            fullWidth/>
                                                                    </Grid>
                                                                    <Grid item xs={12} sm={12} md={6} lg={6} xl={6}>
                                                                        <FormLabel sx={formLabelSx}>Approval program</FormLabel>
                                                                        <div style={{marginTop: '10px'}}>
                                                                            <Button
                                                                                variant="outlined"
                                                                                component="label"
                                                                                size={"small"}
                                                                                color={"warning"}>
                                                                                <FileUploadOutlined fontSize={"small"} sx={{marginRight: '5px'}}></FileUploadOutlined>
                                                                                Upload
                                                                                <input
                                                                                    type="file"
                                                                                    // accept=".teal"
                                                                                    style={{ display: "none" }}
                                                                                    onChange={async (event) => {
                                                                                        const compileResponse = await validateProgram(event);
                                                                                        setState(prevState => ({...prevState, creationParams: {
                                                                                                ...creationParams,
                                                                                                approvalProgram: compileResponse.result
                                                                                            }}));
                                                                                    }} />

                                                                            </Button>
                                                                            {creationParams.approvalProgram ? <div className="teal-program">
                                                                                {creationParams.approvalProgram}
                                                                            </div> : ''}

                                                                        </div>
                                                                    </Grid>

                                                                    <Grid item xs={12} sm={12} md={6} lg={6} xl={6}>
                                                                        <FormLabel sx={formLabelSx}>Clear program</FormLabel>
                                                                        <div style={{marginTop: '10px'}}>
                                                                            <Button
                                                                                variant="outlined"
                                                                                component="label"
                                                                                size={"small"}
                                                                                color={"warning"}>
                                                                                <FileUploadOutlined fontSize={"small"} sx={{marginRight: '5px'}}></FileUploadOutlined>
                                                                                Upload
                                                                                <input
                                                                                    type="file"
                                                                                    // accept=".teal"
                                                                                    style={{ display: "none" }}
                                                                                    onChange={async (event) => {
                                                                                        const compileResponse = await validateProgram(event);
                                                                                        setState(prevState => ({...prevState, creationParams: {
                                                                                                ...creationParams,
                                                                                                clearProgram: compileResponse.result
                                                                                            }}));
                                                                                    }} />
                                                                            </Button>
                                                                            {creationParams.clearProgram ? <div className="teal-program">
                                                                                {creationParams.clearProgram}
                                                                            </div> : ''}

                                                                        </div>
                                                                    </Grid>


                                                                    
                                                                    <Grid item xs={12} sm={12} md={12} lg={12} xl={12}>
                                                                        <FormLabel sx={formLabelSx}>Note</FormLabel>
                                                                        <ShadedInput
                                                                            multiline
                                                                            rows={3}
                                                                            value={creationParams.note}
                                                                            placeholder="Enter your note"
                                                                            onChange={(ev) => {
                                                                                setState(prevState => ({...prevState, creationParams: {
                                                                                        ...creationParams,
                                                                                        note: ev.target.value
                                                                                    }}));
                                                                            }
                                                                            }
                                                                            fullWidth/>
                                                                    </Grid>


                                                                </Grid>

                                                            </div>


                                                        </div>
                                                    </div> : ''}

                                                </div>
                                            </div>
                                            <div className="abi-method-args-form-wrapper">
                                                <div className="abi-method-args-form-container">
                                                    <div className="abi-method-args-form-title">Arguments</div>
                                                    {executorArgs.map((arg, index) => {
                                                        return <div className="abi-method-arg" key={arg.name}>
                                                            <FormLabel sx={formLabelSx}>{`${arg.name} (${arg.type.toString()})`}</FormLabel>
                                                            {abiTypeIsTransaction(arg.type.toString()) ? <div>
                                                                <div className="arg-transaction-wrapper">
                                                                    <div className="arg-transaction-container">
                                                                        {arg.type.toString() === TransactionType.pay ? <div>

                                                                            <FormLabel sx={formLabelSx}>To</FormLabel>
                                                                            <ShadedInput
                                                                                placeholder="To address"
                                                                                multiline
                                                                                rows={2}
                                                                                value={arg.value.to}
                                                                                sx={{...argTransactionSx, marginBottom: '10px'}}
                                                                                onChange={(ev) => {
                                                                                    const processedArgs = executorArgs;
                                                                                    processedArgs[index] = {
                                                                                        ...arg,
                                                                                        value: {
                                                                                            ...arg.value,
                                                                                            to: ev.target.value
                                                                                        }
                                                                                    };

                                                                                    setState(prevState => ({...prevState, executorArgs: processedArgs}));
                                                                                }}
                                                                                fullWidth/>


                                                                            <FormLabel sx={{...formLabelSx}}>Amount</FormLabel>
                                                                            <ShadedInput
                                                                                placeholder="Amount"
                                                                                value={arg.value.amount}
                                                                                sx={argTransactionSx}
                                                                                onChange={(ev) => {
                                                                                    const processedArgs = executorArgs;
                                                                                    processedArgs[index] = {
                                                                                        ...arg,
                                                                                        value: {
                                                                                            ...arg.value,
                                                                                            amount: ev.target.value
                                                                                        }
                                                                                    };

                                                                                    setState(prevState => ({...prevState, executorArgs: processedArgs}));
                                                                                }}
                                                                                fullWidth/>


                                                                        </div> : ''}
                                                                    </div>
                                                                </div>

                                                            </div> : <ShadedInput
                                                                placeholder={arg.type.toString()}
                                                                value={arg.value}
                                                                onChange={(ev) => {
                                                                    const processedArgs = executorArgs;
                                                                    processedArgs[index] = {
                                                                        ...arg,
                                                                        value: ev.target.value
                                                                    };

                                                                    setState(prevState => ({...prevState, executorArgs: processedArgs}));
                                                                }}
                                                                fullWidth/>}

                                                        </div>
                                                    })}
                                                    <div className="abi-method-execute">
                                                        <Button
                                                            style={{marginRight: '10px'}}
                                                            variant={"outlined"}
                                                            className="black-button"
                                                            onClick={onClose}
                                                        >Close</Button>
                                                        <Button
                                                            startIcon={<OfflineBoltIcon></OfflineBoltIcon>}
                                                            variant={"contained"}
                                                            className="black-button"
                                                            onClick={execute}
                                                        >Execute</Button>
                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                    </div>
                                </Grid>
                                <Grid item xs={12} sm={6} md={5} lg={5} xl={5}>
                                    <div className="abi-method-result-wrapper">
                                        <div className="abi-method-result-container">
                                            <div className="abi-method-result-title">
                                                Result
                                            </div>
                                        </div>
                                    </div>
                                </Grid>
                            </Grid>



                        </div>
                    </div>

                </DialogContent>
                <DialogActions>

                </DialogActions>
            </Dialog> : ''}

        </div>
    </div>);
}

export default ABIMethodExecutor;
