import './AssetsList.scss';
import React from "react";
import {useDispatch} from "react-redux";
import {
    Link, Tooltip
} from "@mui/material";
import {DataGrid, GridColDef, GridValueGetterParams} from "@mui/x-data-grid";
import {dataGridCellConfig, dataGridStyles} from "../../../theme/styles/datagrid";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import {copyContent} from "../../../utils/common";
import {CoreAsset} from "../../../packages/core-sdk/classes/CoreAsset";
import LinkToAccount from "../../Common/Links/LinkToAccount";
import LinkToAsset from "../../Common/Links/LinkToAsset";
import CustomNoRowsOverlay from "../../Common/CustomNoRowsOverlay/CustomNoRowsOverlay";


function AssetsList(props): JSX.Element {
    const dispatch = useDispatch();
    let {assets, loading} = props;
    if (!assets) {
        assets = [];
    }
    if (!loading) {
        loading = false;
    }

    const columns: GridColDef[] = [
        {
            ...dataGridCellConfig,
            field: 'name',
            headerName: 'Name',
            renderCell: (params: GridValueGetterParams) => {
                const assetInstance = new CoreAsset(params.row);
                return <div>
                    <LinkToAsset id={assetInstance.getIndex()} name={assetInstance.getName()}></LinkToAsset>
                </div>;
            }
        },
        {
            ...dataGridCellConfig,
            field: 'index',
            headerName: 'ID',
            renderCell: (params: GridValueGetterParams) => {
                const assetInstance = new CoreAsset(params.row);
                return <div>
                    <Tooltip title="Click to copy">
                        <ContentCopyIcon className="copy-content" onClick={(ev) => {
                            copyContent(ev, dispatch, assetInstance.getIndex().toString(), 'Asset id copied');
                        }
                        }></ContentCopyIcon>
                    </Tooltip>
                    <LinkToAsset id={assetInstance.getIndex()}></LinkToAsset>
                </div>;
            }
        },
        {
            ...dataGridCellConfig,
            field: 'unit',
            headerName: 'Unit',
            renderCell: (params: GridValueGetterParams) => {
                const assetInstance = new CoreAsset(params.row);
                return <div>
                    {assetInstance.getUnitName()}
                </div>;
            }
        },
        {
            ...dataGridCellConfig,
            field: 'url',
            headerName: 'Url',
            flex: 2,
            renderCell: (params: GridValueGetterParams) => {
                const assetInstance = new CoreAsset(params.row);
                const url = assetInstance.getUrl();
                return <div>
                    {url ? <Link href={url} target={"_blank"}>{url}</Link> : '--None--'}
                </div>;
            }
        },
        {
            ...dataGridCellConfig,
            field: 'creator',
            headerName: 'Creator',
            flex: 2,
            renderCell: (params: GridValueGetterParams) => {
                const assetInstance = new CoreAsset(params.row);
                return <div>
                    <Tooltip title="Click to copy">
                        <ContentCopyIcon className="copy-content" onClick={(ev) => {
                            copyContent(ev, dispatch, assetInstance.getCreator(), 'Address copied');
                        }
                        }></ContentCopyIcon>
                    </Tooltip>
                    <LinkToAccount address={assetInstance.getCreator()} strip={30}></LinkToAccount>
                </div>;
            }
        }
    ];

    return (<div className={"assets-list-wrapper"}>
        <div className={"assets-list-container"}>
            <div className="assets-list-body">

                <div style={{ height: 700, width: '100%' }}>
                    <DataGrid
                        loading={loading}
                        rows={assets}
                        columns={columns}
                        pageSize={10}
                        rowsPerPageOptions={[10]}
                        disableSelectionOnClick
                        sx={dataGridStyles}
                        getRowId={(row) => {
                            return row.index;
                        }}
                        components={{
                            NoRowsOverlay: CustomNoRowsOverlay
                        }}
                    />
                </div>
            </div>
        </div>
    </div>);
}

export default AssetsList;
