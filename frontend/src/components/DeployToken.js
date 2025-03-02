import React, { useState } from 'react';
import axios from 'axios';

const DeployToken = () => {
    const [name, setName] = useState('');
    const [symbol, setSymbol] = useState('');
    const [supply, setSupply] = useState('');
    const [deployer, setDeployer] = useState('');
    const [salt, setSalt] = useState('');
    const [result, setResult] = useState(null);

    const handleDeploy = async () => {
        try {
            const response = await axios.post('/api/deploy-token', { name, symbol, supply, deployer, salt });
            setResult(response.data);
        } catch (error) {
            console.error(error);
            setResult({ error: error.message });
        }
    };

    return (
        <div>
            <h2>Deploy Token</h2>
            <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <input type="text" placeholder="Symbol" value={symbol} onChange={(e) => setSymbol(e.target.value)} />
            <input type="text" placeholder="Supply" value={supply} onChange={(e) => setSupply(e.target.value)} />
            <input type="text" placeholder="Deployer" value={deployer} onChange={(e) => setDeployer(e.target.value)} />
            <input type="text" placeholder="Salt" value={salt} onChange={(e) => setSalt(e.target.value)} />
            <button onClick={handleDeploy}>Deploy</button>
            {result && <pre>{JSON.stringify(result, null, 2)}</pre>}
        </div>
    );
};

export default DeployToken;
