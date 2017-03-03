import React, { Component } from 'react';
import urijs from 'urijs';
import './App.css';
import fetchBitbucket from './bitbucket';
import RepositoryList from './RepositoryList';
import MergedPullRequestList from './MergedPullRequestList';
import OpenedPullRequestList from './OpenedPullRequestList';

const USERNAME = urijs.parseQuery(urijs().query()).who;

if (!process.env.REACT_APP_BB_AUTH) {
  console.warn('REACT_APP_BB_AUTH is not set, run REACT_APP_BB_AUTH="your-token" npm start');
}

class App extends Component {
  state = {
    repositories: null,
    myPullrequests: [],
  }

  constructor(props) {
    super(props);

    this.reload = this.reload.bind(this);
    this.reloadInterval = null;
  }

  fetchRepositories() {
    return fetchBitbucket('repositories/mapado?sort=-updated_on')
      .then(response => response.json())
      .then(repositories => {
        this.setState({
          repositories,
        });
      })
    ;
  }

  componentDidMount() {
    this.reloadInterval = setInterval(this.reload, 30 * 60 * 1000); // 1 minute
    this.reload();
  }

  componentWillUnmount() {
    if (this.reloadInterval) {
      clearInterval(this.reloadInterval);
    }
  }

  reload() {
    this.fetchRepositories();
  }

  render() {
    if (!USERNAME) {
      const users = [
        'jdeniau',
        'zwit',
        'badaz',
        'cmozzati',
        'thomasdiluccio',
        'Senromain',
        'Fe4nn0r',
        'dallegoet',
        'adrien_fichet',
      ];

      return (<div>
        Who are you ?
        <ul>
          {users.map(user =>
            <li key={user}>
              <a href={`?who=${user}`}>
                {user}
              </a>
            </li>
          )}
        </ul>
      </div>);
    }
    if (!process.env.REACT_APP_BB_AUTH) {
      return (<div>
        Token not set
      </div>);
    }

    if (!this.state.repositories) {
      return null;
    }

    return (
      <div className="App">
        <h2>Last updated repos</h2>
        <RepositoryList
          repositoryList={this.state.repositories}
        />

        <OpenedPullRequestList
          repositories={this.state.repositories.values}
          username={USERNAME}
        />

        <MergedPullRequestList
          repositories={this.state.repositories.values}
          username={USERNAME}
        />
      </div>
    );
  }
}

export default App;
