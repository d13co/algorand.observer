import React, { useEffect } from 'react';
import './Explorer.scss';
import {useDispatch} from "react-redux";
import {initLivedata} from "../../../../redux/explorer/actions/liveData";
import {Outlet, useLocation} from "react-router-dom";
import Header from "../Header/Header";

const network = process.env.REACT_APP_NETWORK;

function Explorer(): JSX.Element {
  const location = useLocation();

  const dispatch = useDispatch();
  dispatch(initLivedata());

  useEffect(() => {
    if (location.pathname.endsWith('/explorer/home')) {
      document.title = `A.O ${network}: Algorand Observer`;
    }
  }, [location]);

  return (
    <div className="explorer-root">
    <Header></Header>
    <Outlet />
    </div>
  );
}

export default Explorer;
