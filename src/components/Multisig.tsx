import React, {useState, useEffect} from "react";
import {useHistory} from "react-router";
import {useSnackbar} from "notistack";
import {encode as encodeBase64} from "js-base64";
import Container from "@material-ui/core/Container";
import AppBar from "@material-ui/core/AppBar";
import GavelIcon from "@material-ui/icons/Gavel";
import DescriptionIcon from "@material-ui/icons/Description";
import Paper from "@material-ui/core/Paper";
import SupervisorAccountIcon from "@material-ui/icons/SupervisorAccount";
import CheckIcon from "@material-ui/icons/Check";
import ReceiptIcon from "@material-ui/icons/Receipt";
import SendIcon from "@material-ui/icons/Send";
import RemoveIcon from "@material-ui/icons/Remove";
import Collapse from "@material-ui/core/Collapse";
import Toolbar from "@material-ui/core/Toolbar";
import InfoIcon from "@material-ui/icons/Info";
import Table from "@material-ui/core/Table";
import TableHead from "@material-ui/core/TableHead";
import TableBody from "@material-ui/core/TableBody";
import TableCell from "@material-ui/core/TableCell";
import TableRow from "@material-ui/core/TableRow";
import BuildIcon from "@material-ui/icons/Build";
import Tooltip from "@material-ui/core/Tooltip";
import CircularProgress from "@material-ui/core/CircularProgress";
import Typography from "@material-ui/core/Typography";
import Card from "@material-ui/core/Card";
import ExpandLess from "@material-ui/icons/ExpandLess";
import ExpandMore from "@material-ui/icons/ExpandMore";
import CardContent from "@material-ui/core/CardContent";
import TextField from "@material-ui/core/TextField";
import IconButton from "@material-ui/core/IconButton";
import Button from "@material-ui/core/Button";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogActions from "@material-ui/core/DialogActions";
import AddIcon from "@material-ui/icons/Add";
import List from "@material-ui/core/List";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import CheckCircleIcon from "@material-ui/icons/CheckCircle";
import BN from "bn.js";
import {
    Account,
    PublicKey,
    SYSVAR_RENT_PUBKEY,
    SYSVAR_CLOCK_PUBKEY,
    SystemProgram, Transaction,
} from "@solana/web3.js";
import {useWallet} from "./WalletProvider";
import {ViewTransactionOnExplorerButton} from "./Notification";
import * as idl from "../utils/idl";
import {networks} from "../store/reducer";
import {ASSOCIATED_TOKEN_PROGRAM_ID, Token, TOKEN_PROGRAM_ID} from "@solana/spl-token"
import BigNumber from "bignumber.js";
import {Buffer} from "buffer";
import BufferLayout from "buffer-layout";

export default function Multisig({multisig}: { multisig?: PublicKey }) {
    return (
        <div>
            <Container fixed maxWidth="md">
                <div
                    style={{
                        position: "fixed",
                        bottom: "75px",
                        right: "75px",
                        display: "flex",
                        flexDirection: "row-reverse",
                    }}
                >
                    <NewMultisigButton/>
                </div>
            </Container>
            {multisig && <MultisigInstance multisig={multisig}/>}
        </div>
    );
}

function NewMultisigButton() {
    const [open, setOpen] = useState(false);
    return (
        <div style={{display: "flex"}}>
            <IconButton
                style={{
                    border: "solid 1pt #ccc",
                    width: "60px",
                    height: "60px",
                    borderRadius: "30px",
                }}
                onClick={() => setOpen(true)}
            >
                <AddIcon/>
            </IconButton>
            <NewMultisigDialog open={open} onClose={() => setOpen(false)}/>
        </div>
    );
}

export function MultisigInstance({multisig}: { multisig: PublicKey }) {
    const {multisigClient} = useWallet();
    const [multisigAccount, setMultisigAccount] = useState<any>(undefined);
    const [transactions, setTransactions] = useState<any>(null);
    const [showSignerDialog, setShowSignerDialog] = useState(false);
    const [showAddTransactionDialog, setShowAddTransactionDialog] = useState(
        false
    );
    const [forceRefresh, setForceRefresh] = useState(false);
    useEffect(() => {
        multisigClient.account
            .multisig.fetch(multisig)
            .then((account: any) => {
                setMultisigAccount(account);
            })
            .catch((err: any) => {
                console.error(err);
                setMultisigAccount(null);
            });
    }, [multisig, multisigClient.account]);
    useEffect(() => {
        multisigClient.account.transaction.all(multisig.toBuffer()).then((txs) => {
            txs = txs.sort((a,b)=>{
                if (a.account.didExecute){
                    if (b.account.didExecute){
                        return 0
                    } else {
                        return 1
                    }
                } else {
                    if (b.account.didExecute){
                        return -1
                    } else {
                        return 0
                    }
                }
            })
            setTransactions(txs);
        });
    }, [multisigClient.account.transaction, multisig, forceRefresh]);
    useEffect(() => {
        multisigClient.account.multisig
            .subscribe(multisig)
            .on("change", (account) => {
                setMultisigAccount(account);
            });
    }, [multisigClient, multisig]);
    return (
        <Container fixed maxWidth="md" style={{marginBottom: "16px"}}>
            <div>
                <Card style={{marginTop: "24px"}}>
                    {multisigAccount === undefined ? (
                        <div style={{padding: "16px"}}>
                            <CircularProgress
                                style={{
                                    display: "block",
                                    marginLeft: "auto",
                                    marginRight: "auto",
                                }}
                            />
                        </div>
                    ) : multisigAccount === null ? (
                        <CardContent>
                            <Typography
                                color="textSecondary"
                                style={{
                                    padding: "24px",
                                    textAlign: "center",
                                }}
                            >
                                Multisig not found
                            </Typography>
                        </CardContent>
                    ) : (
                        <></>
                    )}
                </Card>
                {multisigAccount && (
                    <Paper>
                        <AppBar
                            style={{marginTop: "24px"}}
                            position="static"
                            color="default"
                            elevation={1}
                        >
                            <Toolbar>
                                <Typography variant="h6" style={{flexGrow: 1}} component="h2">
                                    {multisig.toString()} | {multisigAccount.threshold.toString()}{" "}
                                    of {multisigAccount.owners.length.toString()} Multisig
                                </Typography>
                                <Tooltip title="Signer" arrow>
                                    <IconButton onClick={() => setShowSignerDialog(true)}>
                                        <InfoIcon/>
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Add" arrow>
                                    <IconButton onClick={() => setShowAddTransactionDialog(true)}>
                                        <AddIcon/>
                                    </IconButton>
                                </Tooltip>
                            </Toolbar>
                        </AppBar>
                        <List disablePadding>
                            {transactions === null ? (
                                <div style={{padding: "16px"}}>
                                    <CircularProgress
                                        style={{
                                            display: "block",
                                            marginLeft: "auto",
                                            marginRight: "auto",
                                        }}
                                    />
                                </div>
                            ) : transactions.length === 0 ? (
                                <ListItem>
                                    <ListItemText primary="No transactions found"/>
                                </ListItem>
                            ) : (
                                transactions.map((tx: any) => (
                                    <TxListItem
                                        key={tx.publicKey.toString()}
                                        multisig={multisig}
                                        multisigAccount={multisigAccount}
                                        tx={tx}
                                    />
                                ))
                            )}
                        </List>
                    </Paper>
                )}
            </div>
            <AddTransactionDialog
                multisig={multisig}
                open={showAddTransactionDialog}
                onClose={() => setShowAddTransactionDialog(false)}
                didAddTransaction={() => setForceRefresh(!forceRefresh)}
            />
            {multisigAccount && (
                <SignerDialog
                    multisig={multisig}
                    multisigAccount={multisigAccount}
                    open={showSignerDialog}
                    onClose={() => setShowSignerDialog(false)}
                />
            )}
        </Container>
    );
}

export function NewMultisigDialog({
                                      open,
                                      onClose,
                                  }: {
    open: boolean;
    onClose: () => void;
}) {
    const history = useHistory();
    const {multisigClient} = useWallet();
    const {enqueueSnackbar} = useSnackbar();
    const [threshold, setThreshold] = useState(2);
    // @ts-ignore
    const zeroAddr = new PublicKey("11111111111111111111111111111111").toString();
    const [participants, setParticipants] = useState([zeroAddr]);
    const _onClose = () => {
        onClose();
        setThreshold(2);
        setParticipants([zeroAddr, zeroAddr]);
    };
    const [maxParticipantLength, setMaxParticipantLength] = useState(10);
    const disableCreate = maxParticipantLength < participants.length;
    const createMultisig = async () => {
        enqueueSnackbar("Creating multisig", {
            variant: "info",
        });
        const multisig = new Account();
        // Disc. + threshold + nonce.
        const baseSize = 8 + 8 + 1 + 4;
        // Add enough for 2 more participants, in case the user changes one's
        /// mind later.
        const fudge = 64;
        // Can only grow the participant set by 2x the initialized value.
        const ownerSize = maxParticipantLength * 32 + 8;
        const multisigSize = baseSize + ownerSize + fudge;
        const [, nonce] = await PublicKey.findProgramAddress(
            [multisig.publicKey.toBuffer()],
            multisigClient.programId
        );
        const owners = participants.map((p) => new PublicKey(p));
        const tx = await multisigClient.rpc.createMultisig(
            owners,
            new BN(threshold),
            nonce,
            {
                accounts: {
                    multisig: multisig.publicKey,
                    rent: SYSVAR_RENT_PUBKEY,
                },
                signers: [multisig],
                instructions: [
                    await multisigClient.account.multisig.createInstruction(
                        multisig,
                        // @ts-ignore
                        multisigSize
                    ),
                ],
            }
        );
        enqueueSnackbar(`Multisig created: ${multisig.publicKey.toString()}`, {
            variant: "success",
            action: <ViewTransactionOnExplorerButton signature={tx}/>,
        });
        _onClose();
        history.push(`/${multisig.publicKey.toString()}`);
    };
    return (
        <Dialog fullWidth open={open} onClose={_onClose} maxWidth="md">
            <DialogTitle>
                <Typography variant="h4" component="h2">
                    New Multisig
                </Typography>
            </DialogTitle>
            <DialogContent>
                <TextField
                    fullWidth
                    label="Threshold"
                    value={threshold}
                    type="number"
                    onChange={(e) => setThreshold(parseInt(e.target.value) as number)}
                />
                <TextField
                    fullWidth
                    label="Max Number of Participants (cannot grow the owner set past this)"
                    value={maxParticipantLength}
                    type="number"
                    onChange={(e) => setMaxParticipantLength(parseInt(e.target.value) as number)}
                />
                {participants.map((p, idx) => (
                    <TextField
                        key={p}
                        fullWidth
                        label="Participant"
                        value={p}
                        onChange={(e) => {
                            const p = [...participants];
                            p[idx] = e.target.value;
                            setParticipants(p);
                        }}
                    />
                ))}
                <div style={{display: "flex", justifyContent: "flex-end"}}>
                    <IconButton
                        onClick={() => {
                            const p = [...participants];
                            // @ts-ignore
                            setParticipants(p.slice(0, p.length - 1));
                        }}
                    >
                        <RemoveIcon/>
                    </IconButton>
                    <IconButton
                        onClick={() => {
                            const p = [...participants];
                            // @ts-ignore
                            p.push(zeroAddr);
                            setParticipants(p);
                        }}
                    >
                        <AddIcon/>
                    </IconButton>
                </div>
            </DialogContent>
            <DialogActions>
                <Button onClick={_onClose}>Cancel</Button>
                <Button
                    disabled={disableCreate}
                    variant="contained"
                    type="submit"
                    color="primary"
                    onClick={() =>
                        createMultisig().catch((err) => {
                            const str = err ? err.toString() : "";
                            enqueueSnackbar(`Error creating multisig: ${str}`, {
                                variant: "error",
                            });
                        })
                    }
                >
                    Create
                </Button>
            </DialogActions>
        </Dialog>
    );
}

function TxListItem({
                        multisig,
                        multisigAccount,
                        tx,
                    }: {
    multisig: PublicKey;
    multisigAccount: any;
    tx: any;
}) {
    const {enqueueSnackbar} = useSnackbar();
    const {multisigClient} = useWallet();
    const [open, setOpen] = useState(false);
    const [txAccount, setTxAccount] = useState(tx.account);
    useEffect(() => {
        multisigClient.account.transaction
            .subscribe(tx.publicKey)
            .on("change", (account) => {
                setTxAccount(account);
            });
    }, [multisigClient, multisig, tx.publicKey]);
    const rows = [
        {
            field: "Program ID",
            value: txAccount.programId.toString(),
        },
        {
            field: "Did execute",
            value: txAccount.didExecute.toString(),
        },
        {
            field: "Instruction data",
            value: (
                <code
                    style={{
                        wordBreak: "break-word",
                        width: "370px",
                        background: "black",
                        color: "#ffffff",
                        float: "right",
                        textAlign: "left",
                    }}
                >
                    {encodeBase64(txAccount.data)}
                </code>
            ),
        },
        {
            field: "Multisig",
            value: txAccount.multisig.toString(),
        },
        {
            field: "Transaction account",
            value: tx.publicKey.toString(),
        },
        {
            field: "Owner set seqno",
            value: txAccount.ownerSetSeqno.toString(),
        },
    ];
    const msAccountRows = multisigAccount.owners.map(
        (owner: PublicKey, idx: number) => {
            return {
                field: owner.toString(),
                value: txAccount.signers[idx] ? <CheckIcon/> : <RemoveIcon/>,
            };
        }
    );
    const approve = async () => {
        enqueueSnackbar("Approving transaction", {
            variant: "info",
        });
        await multisigClient.rpc.approve({
            accounts: {
                multisig,
                transaction: tx.publicKey,
                owner: multisigClient.provider.wallet.publicKey,
            },
        });
        enqueueSnackbar("Transaction approved", {
            variant: "success",
        });
    };
    const execute = async () => {
        enqueueSnackbar("Executing transaction", {
            variant: "info",
        });
        const [multisigSigner] = await PublicKey.findProgramAddress(
            [multisig.toBuffer()],
            multisigClient.programId
        );
        await multisigClient.rpc.executeTransaction({
            accounts: {
                multisig,
                multisigSigner,
                transaction: tx.publicKey,
            },
            remainingAccounts: txAccount.accounts
                .map((t: any) => {
                    if (t.pubkey.equals(multisigSigner)) {
                        return {...t, isSigner: false};
                    }
                    return t;
                })
                .concat({
                    pubkey: txAccount.programId,
                    isWritable: false,
                    isSigner: false,
                }),
        });
        enqueueSnackbar("Transaction executed", {
            variant: "success",
        });
    };
    return (
        <>
            <ListItem button onClick={() => setOpen(!open)}>
                <ListItemIcon>{icon(tx, multisigClient)}</ListItemIcon>
                {ixLabel(tx, multisigClient)}
                {txAccount.didExecute && (
                    <CheckCircleIcon style={{marginRight: "16px"}}/>
                )}
                {open ? <ExpandLess/> : <ExpandMore/>}
            </ListItem>
            <Collapse in={open} timeout="auto" unmountOnExit>
                <div style={{background: "#ececec", padding: "10px"}}>
                    <div style={{display: "flex", justifyContent: "flex-end"}}>
                        <Button
                            style={{marginRight: "10px"}}
                            variant="contained"
                            color="primary"
                            onClick={() =>
                                approve().catch((err) => {
                                    let errStr = "";
                                    if (err) {
                                        errStr = err.toString();
                                    }
                                    enqueueSnackbar(`Unable to approve transaction: ${errStr}`, {
                                        variant: "error",
                                    });
                                })
                            }
                        >
                            Approve
                        </Button>
                        <Button
                            variant="contained"
                            color="secondary"
                            onClick={() =>
                                execute().catch((err) => {
                                    let errStr = "";
                                    if (err) {
                                        errStr = err.toString();
                                    }
                                    enqueueSnackbar(`Unable to execute transaction: ${errStr}`, {
                                        variant: "error",
                                    });
                                })
                            }
                        >
                            Execute
                        </Button>
                    </div>
                    <Card style={{marginTop: "16px"}}>
                        <CardContent>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Transaction Field</TableCell>
                                        <TableCell align="right">Value</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {rows.map((r) => (
                                        <TableRow>
                                            <TableCell>{r.field}</TableCell>
                                            <TableCell align="right">{r.value}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                    <Card style={{marginTop: "16px"}}>
                        <CardContent>
                            <Table>
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Multisig Owner</TableCell>
                                        <TableCell align="right">Did Sign</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {txAccount.ownerSetSeqno === multisigAccount.ownerSetSeqno &&
                                        msAccountRows.map((r: any) => (
                                            <TableRow>
                                                <TableCell>{r.field}</TableCell>
                                                <TableCell align="right">{r.value}</TableCell>
                                            </TableRow>
                                        ))}
                                </TableBody>
                            </Table>
                            {txAccount.ownerSetSeqno !== multisigAccount.ownerSetSeqno && (
                                <div style={{marginTop: "16px"}}>
                                    <Typography
                                        color="textSecondary"
                                        style={{textAlign: "center"}}
                                    >
                                        The owner set has changed since this transaction was created
                                    </Typography>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                    <Card style={{marginTop: "16px"}}>
                        <CardContent>
                            <AccountsList accounts={txAccount.accounts}/>
                        </CardContent>
                    </Card>
                </div>
            </Collapse>
        </>
    );
}
const uint64 = (property = 'uint64') => {
    const layout = BufferLayout.blob(8, property);

    const _decode = layout.decode.bind(layout);
    const _encode = layout.encode.bind(layout);

    // @ts-ignore
    layout.decode = (buffer: Buffer, offset: number) => {
        const data = _decode(buffer, offset);
        return new BN(
            // @ts-ignore
            [...data]
                .reverse()
                .map(i => `00${i.toString(16)}`.slice(-2))
                .join(''),
            16,
        );
    };
    // @ts-ignore
    layout.encode = (num: BN, buffer: Buffer, offset: number) => {
        const a = num.toArray().reverse();
        let b = Buffer.from(a);
        if (b.length !== 8) {
            const zeroPad = Buffer.alloc(8);
            b.copy(zeroPad);
            b = zeroPad;
        }
        return _encode(b, buffer, offset);
    };

    return layout;
};
function ixLabel(tx: any, multisigClient: any) {
    if (tx.account.programId.equals(TOKEN_PROGRAM_ID)){
        // Send token
        const dataLayout = BufferLayout.struct([BufferLayout.u8('instruction'), uint64('amount')]);

        const data = dataLayout.decode(tx.account.data)
        return (
            <ListItemText
                // @ts-ignore
                primary={"Send Larix: "+new BigNumber(data.amount.toString()).div(10**6)}
                secondary={tx.publicKey.toString()}
            />
        );
    }
    if (tx.account.programId.equals(BPF_LOADER_UPGRADEABLE_PID)) {
        // Upgrade instruction.
        if (tx.account.data.equals(Buffer.from([3, 0, 0, 0]))) {
            return (
                <ListItemText
                    primary="Program upgrade"
                    secondary={tx.publicKey.toString()}
                />
            );
        }
    }

    if (tx.account.programId.equals(multisigClient.programId)) {
        const setThresholdSighash = multisigClient.coder.sighash(
            "global",
            "change_threshold"
        );
        if (setThresholdSighash.equals(tx.account.data.slice(0, 8))) {
            return (
                <ListItemText
                    primary="Set threshold"
                    secondary={tx.publicKey.toString()}
                />
            );
        }
        const setOwnersSighash = multisigClient.coder.sighash(
            "global",
            "set_owners"
        );
        if (setOwnersSighash.equals(tx.account.data.slice(0, 8))) {
            return (
                <ListItemText
                    primary="Set owners"
                    secondary={tx.publicKey.toString()}
                />
            );
        }
    }
    if (idl.IDL_TAG.equals(tx.account.data.slice(0, 8))) {
        return (
            <ListItemText primary="Upgrade IDL" secondary={tx.publicKey.toString()}/>
        );
    }
    return <ListItemText primary={tx.publicKey.toString()}/>;
}

function AccountsList({accounts}: { accounts: any }) {
    return (
        <Table>
            <TableHead>
                <TableRow>
                    <TableCell>Account</TableCell>
                    <TableCell align="right">Writable</TableCell>
                    <TableCell align="right">Signer</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {accounts.map((r: any) => (
                    <TableRow>
                        <TableCell>{r.pubkey.toString()}</TableCell>
                        <TableCell align="right">{r.isWritable.toString()}</TableCell>
                        <TableCell align="right">{r.isSigner.toString()}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

function SignerDialog({
                          multisig,
                          multisigAccount,
                          open,
                          onClose,
                      }: {
    multisig: PublicKey;
    multisigAccount: any;
    open: boolean;
    onClose: () => void;
}) {
    const {multisigClient} = useWallet();
    const [signer, setSigner] = useState<null | string>(null);
    useEffect(() => {
        PublicKey.findProgramAddress(
            [multisig.toBuffer()],
            multisigClient.programId
        ).then((addrNonce) => setSigner(addrNonce[0].toString()));
    }, [multisig, multisigClient.programId, setSigner]);

    return (
        <Dialog open={open} fullWidth onClose={onClose} maxWidth="md">
            <DialogTitle>
                <Typography variant="h4" component="h2">
                    Multisig Info
                </Typography>
            </DialogTitle>
            <DialogContent style={{paddingBottom: "16px"}}>
                {multisig?.equals(networks.mainnet.multisigUpgradeAuthority!) && (
                    <DialogContentText>
                        This multisig is the upgrade authority for the multisig program
                        itself.
                    </DialogContentText>
                )}
                <DialogContentText>
                    <b>Program derived address</b>: {signer}. This is the address one
                    should use as the authority for data governed by the multisig.
                </DialogContentText>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Owners</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {multisigAccount.owners.map((r: any) => (
                            <TableRow>
                                <TableCell>{r.toString()}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
}

function AddTransactionDialog({
                                  multisig,
                                  open,
                                  onClose,
                                  didAddTransaction,
                              }: {
    multisig: PublicKey;
    open: boolean;
    onClose: () => void;
    didAddTransaction: (tx: PublicKey) => void;
}) {
    return (
        <Dialog open={open} fullWidth onClose={onClose} maxWidth="md">
            <DialogTitle>
                <Typography variant="h4" component="h2">
                    New Transaction
                </Typography>
            </DialogTitle>
            <DialogContent style={{paddingBottom: "16px"}}>
                <DialogContentText>
                    Create a new transaction to be signed by the multisig. This
                    transaction will not execute until enough owners have signed the
                    transaction.
                </DialogContentText>
                <List disablePadding>
                    <SendLarixListItem
                        didAddTransaction={didAddTransaction}
                        multisig={multisig}
                        onClose={onClose}
                    />
                    <MultisigSetOwnersListItem
                        didAddTransaction={didAddTransaction}
                        multisig={multisig}
                        onClose={onClose}
                    />
                    <ChangeThresholdListItem
                        didAddTransaction={didAddTransaction}
                        multisig={multisig}
                        onClose={onClose}
                    />
                </List>
            </DialogContent>
        </Dialog>
    );
}

function ChangeThresholdListItem({
                                     multisig,
                                     onClose,
                                     didAddTransaction,
                                 }: {
    multisig: PublicKey;
    onClose: Function;
    didAddTransaction: (tx: PublicKey) => void;
}) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <ListItem button onClick={() => setOpen((open) => !open)}>
                <ListItemIcon>
                    <GavelIcon/>
                </ListItemIcon>
                <ListItemText primary={"Change threshold"}/>
                {open ? <ExpandLess/> : <ExpandMore/>}
            </ListItem>
            <Collapse in={open} timeout="auto" unmountOnExit>
                <ChangeThresholdListItemDetails
                    didAddTransaction={didAddTransaction}
                    multisig={multisig}
                    onClose={onClose}
                />
            </Collapse>
        </>
    );
}

function ChangeThresholdListItemDetails({
                                            multisig,
                                            onClose,
                                            didAddTransaction,
                                        }: {
    multisig: PublicKey;
    onClose: Function;
    didAddTransaction: (tx: PublicKey) => void;
}) {
    const [threshold, setThreshold] = useState(2);
    const {multisigClient} = useWallet();
    // @ts-ignore
    const {enqueueSnackbar} = useSnackbar();
    const changeThreshold = async () => {
        enqueueSnackbar("Creating change threshold transaction", {
            variant: "info",
        });
        const data = changeThresholdData(multisigClient, threshold);
        const [multisigSigner] = await PublicKey.findProgramAddress(
            [multisig.toBuffer()],
            multisigClient.programId
        );
        const accounts = [
            {
                pubkey: multisig,
                isWritable: true,
                isSigner: false,
            },
            {
                pubkey: multisigSigner,
                isWritable: false,
                isSigner: true,
            },
        ];
        const transaction = new Account();
        const txSize = 1000; // todo
        const tx = await multisigClient.rpc.createTransaction(
            multisigClient.programId,
            accounts,
            data,
            {
                accounts: {
                    multisig,
                    transaction: transaction.publicKey,
                    proposer: multisigClient.provider.wallet.publicKey,
                    rent: SYSVAR_RENT_PUBKEY,
                },
                signers: [transaction],
                instructions: [
                    await multisigClient.account.transaction.createInstruction(
                        transaction,
                        // @ts-ignore
                        txSize
                    ),
                ],
            }
        );
        enqueueSnackbar("Transaction created", {
            variant: "success",
            action: <ViewTransactionOnExplorerButton signature={tx}/>,
        });
        didAddTransaction(transaction.publicKey);
        onClose();
    };
    return (
        <div
            style={{
                background: "#f1f0f0",
                paddingLeft: "24px",
                paddingRight: "24px",
            }}
        >
            <TextField
                fullWidth
                style={{marginTop: "16px"}}
                label="Threshold"
                value={threshold}
                type="number"
                onChange={(e) => {
                    // @ts-ignore
                    setThreshold(e.target.value);
                }}
            />
            <div style={{display: "flex", justifyContent: "flex-end"}}>
                <Button onClick={() => changeThreshold()}>Change Threshold</Button>
            </div>
        </div>
    );
}

function MultisigSetOwnersListItem({
                                       multisig,
                                       onClose,
                                       didAddTransaction,
                                   }: {
    multisig: PublicKey;
    onClose: Function;
    didAddTransaction: (tx: PublicKey) => void;
}) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <ListItem button onClick={() => setOpen((open) => !open)}>
                <ListItemIcon>
                    <SupervisorAccountIcon/>
                </ListItemIcon>
                <ListItemText primary={"Set owners"}/>
                {open ? <ExpandLess/> : <ExpandMore/>}
            </ListItem>
            <Collapse in={open} timeout="auto" unmountOnExit>
                <SetOwnersListItemDetails
                    didAddTransaction={didAddTransaction}
                    multisig={multisig}
                    onClose={onClose}
                />
            </Collapse>
        </>
    );
}

function SetOwnersListItemDetails({
                                      multisig,
                                      onClose,
                                      didAddTransaction,
                                  }: {
    multisig: PublicKey;
    onClose: Function;
    didAddTransaction: (tx: PublicKey) => void;
}) {
    const {multisigClient} = useWallet();
    // @ts-ignore
    const zeroAddr = new PublicKey("11111111111111111111111111111111").toString();
    const [participants, setParticipants] = useState([zeroAddr]);
    const {enqueueSnackbar} = useSnackbar();
    const setOwners = async () => {
        enqueueSnackbar("Creating setOwners transaction", {
            variant: "info",
        });
        const owners = participants.map((p) => new PublicKey(p));
        const data = setOwnersData(multisigClient, owners);
        const [multisigSigner] = await PublicKey.findProgramAddress(
            [multisig.toBuffer()],
            multisigClient.programId
        );
        const accounts = [
            {
                pubkey: multisig,
                isWritable: true,
                isSigner: false,
            },
            {
                pubkey: multisigSigner,
                isWritable: false,
                isSigner: true,
            },
        ];
        const transaction = new Account();
        const txSize = 5000; // TODO: tighter bound.
        const tx = await multisigClient.rpc.createTransaction(
            multisigClient.programId,
            accounts,
            data,
            {
                accounts: {
                    multisig,
                    transaction: transaction.publicKey,
                    proposer: multisigClient.provider.wallet.publicKey,
                    rent: SYSVAR_RENT_PUBKEY,
                },
                signers: [transaction],
                instructions: [
                    await multisigClient.account.transaction.createInstruction(
                        transaction,
                        // @ts-ignore
                        txSize
                    ),
                ],
            }
        );
        enqueueSnackbar("Transaction created", {
            variant: "success",
            action: <ViewTransactionOnExplorerButton signature={tx}/>,
        });
        didAddTransaction(transaction.publicKey);
        onClose();
    };
    return (
        <div
            style={{
                background: "#f1f0f0",
                paddingLeft: "24px",
                paddingRight: "24px",
            }}
        >
            {participants.map((p, idx) => (
                <TextField
                    fullWidth
                    style={{marginTop: "16px"}}
                    label="Participant"
                    value={p}
                    onChange={(e) => {
                        const p = [...participants];
                        p[idx] = e.target.value;
                        setParticipants(p);
                    }}
                />
            ))}
            <div style={{display: "flex", justifyContent: "flex-end"}}>
                <IconButton
                    onClick={() => {
                        const p = [...participants];
                        // @ts-ignore
                        p.push(new PublicKey("11111111111111111111111111111111").toString());
                        setParticipants(p);
                    }}
                >
                    <AddIcon/>
                </IconButton>
            </div>
            <div
                style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: "16px",
                    paddingBottom: "16px",
                }}
            >
                <Button onClick={() => setOwners()}>Set Owners</Button>
            </div>
        </div>
    );
}

function SendLarixListItem({
                               multisig,
                               onClose,
                               didAddTransaction,
                           }: {
    multisig: PublicKey;
    onClose: Function;
    didAddTransaction: (tx: PublicKey) => void;
}) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <ListItem button onClick={() => setOpen((open) => !open)}>
                <ListItemIcon>
                    <DescriptionIcon/>
                </ListItemIcon>
                <ListItemText primary={"Send Larix"}/>
                {open ? <ExpandLess/> : <ExpandMore/>}
            </ListItem>
            <Collapse in={open} timeout="auto" unmountOnExit>
                <SendLarixListItemDetails
                    didAddTransaction={didAddTransaction}
                    multisig={multisig}
                    onClose={onClose}
                />
            </Collapse>
        </>
    );
}

function SendLarixListItemDetails({
                                      multisig,
                                      onClose,
                                      didAddTransaction,
                                  }: {
    multisig: PublicKey;
    onClose: Function;
    didAddTransaction: (tx: PublicKey) => void;
}) {
    const [target, setTarget] = useState<null | string>(null);
    const [totalAmount, setTotalAmount] = useState<null | string>(null);
    const [amount, setAmount] = useState<null | number>(null);

    const {multisigClient} = useWallet();
    const [signer, setSigner] = useState<null | string>(null);
    const larixTokenAddress = new PublicKey("Lrxqnh6ZHKbGy3dcrCED43nsoLkM1LTzU2jRfWe8qUC")
    useEffect(() => {
        PublicKey.findProgramAddress(
            [multisig.toBuffer()],
            multisigClient.programId
        ).then(async (addrNonce) => {
            setSigner(addrNonce[0].toString())
            const associatedTokenAddress = await Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, larixTokenAddress, new PublicKey(addrNonce[0].toString()), true)
            // @ts-ignore
            const token = new Token(multisigClient.provider.connection, larixTokenAddress, TOKEN_PROGRAM_ID, multisigClient.provider.wallet)
            const tokenAccount = await token.getAccountInfo(associatedTokenAddress)
            const tokenAmount = new BigNumber(tokenAccount.amount.toString()).div(10 ** 6).toFixed(6)
            setTotalAmount(tokenAmount)
        });
    }, [multisig, multisigClient.programId, setSigner]);

    const {enqueueSnackbar} = useSnackbar();
    const createTransactionAccount = async (amount: number, target: PublicKey, signer: PublicKey) => {
        enqueueSnackbar("Creating transaction", {
            variant: "info",
        });
        const associatedTokenAddress = await Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, larixTokenAddress, signer, true)
        const sendInstruction = Token.createTransferInstruction(
            TOKEN_PROGRAM_ID,
            associatedTokenAddress,
            target,
            signer,
            [],
            parseInt(amount * 10 ** 6 + "")
        )

        const data = Buffer.from(sendInstruction.data);
        const accs = sendInstruction.keys;
        /*
            pub struct Transaction {
                // The multisig account this transaction belongs to.
                pub multisig: Pubkey,
                // Target program to execute against.
                pub program_id: Pubkey,
                // Accounts requried for the transaction.
                pub accounts: Vec<TransactionAccount>,
                // Instruction data for the transaction.
                pub data: Vec<u8>,
                // signers[index] is true iff multisig.owners[index] signed the transaction.
                pub signers: Vec<bool>,
                // Boolean ensuring one time execution.
                pub did_execute: bool,
                // Owner set sequence number.
                pub owner_set_seqno: u32,
            }
            #[derive(AnchorSerialize, AnchorDeserialize, Clone)]
            pub struct TransactionAccount {
                pub pubkey: Pubkey,
                pub is_signer: bool,
                pub is_writable: bool,
            }
         */
        const txSize =
            8 + // anchor head
            32 +
            32 +
            (4 + 34 * 3) +
            9 +
            (4 + 10) +
            1 +
            4; // TODO: tighter bound.
        const transaction = new Account();
        const tx = await multisigClient.rpc.createTransaction(
            sendInstruction.programId,
            accs,
            data,
            {
                accounts: {
                    multisig,
                    transaction: transaction.publicKey,
                    proposer: multisigClient.provider.wallet.publicKey,
                    rent: SYSVAR_RENT_PUBKEY,
                },
                signers: [transaction],
                instructions: [
                    await multisigClient.account.transaction.createInstruction(
                        transaction,
                        // @ts-ignore
                        txSize
                    ),
                ],
            }
        );
        enqueueSnackbar("Transaction created", {
            variant: "success",
            action: <ViewTransactionOnExplorerButton signature={tx}/>,
        });
        didAddTransaction(transaction.publicKey);
    }
    const checkAndCreateSendTransaction = async () => {

        if (amount === null || signer === null || target === null) {
            return
        }
        const signerAddress = new PublicKey(signer)
        let targetAddress = new PublicKey(target)
        let targetAccountInfo = await multisigClient.provider.connection.getAccountInfo(targetAddress)
        if (targetAccountInfo === null || targetAccountInfo?.owner.equals(SystemProgram.programId)) {
            const targetAssociatedTokenAccountAddress = await Token.getAssociatedTokenAddress(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, larixTokenAddress, targetAddress)
            const targetAssociatedTokenAccountInfo = await multisigClient.provider.connection.getAccountInfo(targetAssociatedTokenAccountAddress)
            if (targetAssociatedTokenAccountInfo === null) {
                enqueueSnackbar("Creating target associated token account", {
                    variant: "info",
                });
                const transaction = new Transaction()
                transaction.feePayer = multisigClient.provider.wallet.publicKey

                transaction.recentBlockhash = (
                    await multisigClient.provider.connection.getRecentBlockhash("max")
                ).blockhash;
                transaction.add(Token.createAssociatedTokenAccountInstruction(
                    ASSOCIATED_TOKEN_PROGRAM_ID,
                    TOKEN_PROGRAM_ID,
                    larixTokenAddress,
                    targetAssociatedTokenAccountAddress,
                    targetAddress,
                    multisigClient.provider.wallet.publicKey
                ))
                await multisigClient.provider.wallet.signTransaction(transaction)
                await multisigClient.provider.connection.sendRawTransaction(transaction.serialize());
            }
            await createTransactionAccount(amount, targetAssociatedTokenAccountAddress, signerAddress)
        } else {
            await createTransactionAccount(amount, targetAddress, signerAddress)
        }
        onClose();
    };

    return (
        <div
            style={{
                background: "#f1f0f0",
                paddingLeft: "24px",
                paddingRight: "24px",
            }}
        >
            <TextField
                fullWidth
                style={{marginTop: "16px"}}
                label="Target address"
                value={target}
                onChange={(e) => setTarget(e.target.value as string)}
            />
            <TextField
                style={{marginTop: "16px"}}
                fullWidth
                label={totalAmount}
                value={amount}
                onChange={(e) => setAmount(e.target.value ? parseInt(e.target.value) : 0)}
            />
            <div
                style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: "16px",
                    paddingBottom: "16px",
                }}
            >
                <Button onClick={() => checkAndCreateSendTransaction()}>
                    Send
                </Button>
            </div>
        </div>
    );
}

function IdlUpgradeListItem({
                                multisig,
                                onClose,
                                didAddTransaction,
                            }: {
    multisig: PublicKey;
    onClose: Function;
    didAddTransaction: (tx: PublicKey) => void;
}) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <ListItem button onClick={() => setOpen((open) => !open)}>
                <ListItemIcon>
                    <DescriptionIcon/>
                </ListItemIcon>
                <ListItemText primary={"Upgrade IDL"}/>
                {open ? <ExpandLess/> : <ExpandMore/>}
            </ListItem>
            <Collapse in={open} timeout="auto" unmountOnExit>
                <UpgradeIdlListItemDetails
                    didAddTransaction={didAddTransaction}
                    multisig={multisig}
                    onClose={onClose}
                />
            </Collapse>
        </>
    );
}

function UpgradeIdlListItemDetails({
                                       multisig,
                                       onClose,
                                       didAddTransaction,
                                   }: {
    multisig: PublicKey;
    onClose: Function;
    didAddTransaction: (tx: PublicKey) => void;
}) {
    const [programId, setProgramId] = useState<null | string>(null);
    const [buffer, setBuffer] = useState<null | string>(null);

    const {multisigClient} = useWallet();
    const {enqueueSnackbar} = useSnackbar();
    const createTransactionAccount = async () => {
        enqueueSnackbar("Creating transaction", {
            variant: "info",
        });
        const programAddr = new PublicKey(programId as string);
        const bufferAddr = new PublicKey(buffer as string);
        const idlAddr = await idlAddress(programAddr);
        const [multisigSigner] = await PublicKey.findProgramAddress(
            [multisig.toBuffer()],
            multisigClient.programId
        );
        const data = idl.encodeInstruction({setBuffer: {}});
        const accs = [
            {
                pubkey: bufferAddr,
                isWritable: true,
                isSigner: false,
            },
            {pubkey: idlAddr, isWritable: true, isSigner: false},
            {pubkey: multisigSigner, isWritable: true, isSigner: false},
        ];
        const txSize = 1000; // TODO: tighter bound.
        const transaction = new Account();
        const tx = await multisigClient.rpc.createTransaction(
            programAddr,
            accs,
            data,
            {
                accounts: {
                    multisig,
                    transaction: transaction.publicKey,
                    proposer: multisigClient.provider.wallet.publicKey,
                    rent: SYSVAR_RENT_PUBKEY,
                },
                signers: [transaction],
                instructions: [
                    await multisigClient.account.transaction.createInstruction(
                        transaction,
                        // @ts-ignore
                        txSize
                    ),
                ],
            }
        );
        enqueueSnackbar("Transaction created", {
            variant: "success",
            action: <ViewTransactionOnExplorerButton signature={tx}/>,
        });
        didAddTransaction(transaction.publicKey);
        onClose();
    };

    return (
        <div
            style={{
                background: "#f1f0f0",
                paddingLeft: "24px",
                paddingRight: "24px",
            }}
        >
            <TextField
                fullWidth
                style={{marginTop: "16px"}}
                label="Program ID"
                value={programId}
                onChange={(e) => setProgramId(e.target.value as string)}
            />
            <TextField
                style={{marginTop: "16px"}}
                fullWidth
                label="New IDL buffer"
                value={buffer}
                onChange={(e) => setBuffer(e.target.value as string)}
            />
            <div
                style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: "16px",
                    paddingBottom: "16px",
                }}
            >
                <Button onClick={() => createTransactionAccount()}>
                    Create upgrade
                </Button>
            </div>
        </div>
    );
}

function ProgramUpdateListItem({
                                   multisig,
                                   onClose,
                                   didAddTransaction,
                               }: {
    multisig: PublicKey;
    onClose: Function;
    didAddTransaction: (tx: PublicKey) => void;
}) {
    const [open, setOpen] = useState(false);
    return (
        <>
            <ListItem button onClick={() => setOpen((open) => !open)}>
                <ListItemIcon>
                    <BuildIcon/>
                </ListItemIcon>
                <ListItemText primary={"Upgrade program"}/>
                {open ? <ExpandLess/> : <ExpandMore/>}
            </ListItem>
            <Collapse in={open} timeout="auto" unmountOnExit>
                <UpgradeProgramListItemDetails
                    didAddTransaction={didAddTransaction}
                    multisig={multisig}
                    onClose={onClose}
                />
            </Collapse>
        </>
    );
}

const BPF_LOADER_UPGRADEABLE_PID = new PublicKey(
    "BPFLoaderUpgradeab1e11111111111111111111111"
);

function UpgradeProgramListItemDetails({
                                           multisig,
                                           onClose,
                                           didAddTransaction,
                                       }: {
    multisig: PublicKey;
    onClose: Function;
    didAddTransaction: (tx: PublicKey) => void;
}) {
    const [programId, setProgramId] = useState<null | string>(null);
    const [buffer, setBuffer] = useState<null | string>(null);

    const {multisigClient} = useWallet();
    const {enqueueSnackbar} = useSnackbar();
    const createTransactionAccount = async () => {
        enqueueSnackbar("Creating transaction", {
            variant: "info",
        });
        const programAddr = new PublicKey(programId as string);
        const bufferAddr = new PublicKey(buffer as string);
        // Hard code serialization.
        const data = Buffer.from([3, 0, 0, 0]);

        const programAccount = await (async () => {
            const programAccount = await multisigClient.provider.connection.getAccountInfo(
                programAddr
            );
            if (programAccount === null) {
                throw new Error("Invalid program ID");
            }
            return {
                // Hard code deserialization.
                programdataAddress: new PublicKey(programAccount.data.slice(4)),
            };
        })();
        const spill = multisigClient.provider.wallet.publicKey;
        const [multisigSigner] = await PublicKey.findProgramAddress(
            [multisig.toBuffer()],
            multisigClient.programId
        );
        const accs = [
            {
                pubkey: programAccount.programdataAddress,
                isWritable: true,
                isSigner: false,
            },
            {pubkey: programAddr, isWritable: true, isSigner: false},
            {pubkey: bufferAddr, isWritable: true, isSigner: false},
            {pubkey: spill, isWritable: true, isSigner: false},
            {pubkey: SYSVAR_RENT_PUBKEY, isWritable: false, isSigner: false},
            {pubkey: SYSVAR_CLOCK_PUBKEY, isWritable: false, isSigner: false},
            {pubkey: multisigSigner, isWritable: false, isSigner: false},
        ];
        const txSize = 1000; // TODO: tighter bound.
        const transaction = new Account();
        const tx = await multisigClient.rpc.createTransaction(
            BPF_LOADER_UPGRADEABLE_PID,
            accs,
            data,
            {
                accounts: {
                    multisig,
                    transaction: transaction.publicKey,
                    proposer: multisigClient.provider.wallet.publicKey,
                    rent: SYSVAR_RENT_PUBKEY,
                },
                signers: [transaction],
                instructions: [
                    await multisigClient.account.transaction.createInstruction(
                        transaction,
                        // @ts-ignore
                        txSize
                    ),
                ],
            }
        );
        enqueueSnackbar("Transaction created", {
            variant: "success",
            action: <ViewTransactionOnExplorerButton signature={tx}/>,
        });
        didAddTransaction(transaction.publicKey);
        onClose();
    };

    return (
        <div
            style={{
                background: "#f1f0f0",
                paddingLeft: "24px",
                paddingRight: "24px",
            }}
        >
            <TextField
                fullWidth
                style={{marginTop: "16px"}}
                label="Program ID"
                value={programId}
                onChange={(e) => setProgramId(e.target.value as string)}
            />
            <TextField
                style={{marginTop: "16px"}}
                fullWidth
                label="New program buffer"
                value={buffer}
                onChange={(e) => setBuffer(e.target.value as string)}
            />
            <div
                style={{
                    display: "flex",
                    justifyContent: "flex-end",
                    marginTop: "16px",
                    paddingBottom: "16px",
                }}
            >
                <Button onClick={() => createTransactionAccount()}>
                    Create upgrade
                </Button>
            </div>
        </div>
    );
}

// @ts-ignore
function icon(tx, multisigClient) {
    if (tx.account.programId.equals(BPF_LOADER_UPGRADEABLE_PID)) {
        return <BuildIcon/>;
    }
    if (tx.account.programId.equals(TOKEN_PROGRAM_ID)){
        return <SendIcon/>
    }
    if (tx.account.programId.equals(multisigClient.programId)) {
        const setThresholdSighash = multisigClient.coder.sighash(
            "global",
            "change_threshold"
        );
        if (setThresholdSighash.equals(tx.account.data.slice(0, 8))) {
            return <GavelIcon/>;
        }
        const setOwnersSighash = multisigClient.coder.sighash(
            "global",
            "set_owners"
        );
        if (setOwnersSighash.equals(tx.account.data.slice(0, 8))) {
            return <SupervisorAccountIcon/>;
        }
    }
    if (idl.IDL_TAG.equals(tx.account.data.slice(0, 8))) {
        return <DescriptionIcon/>;
    }
    return <ReceiptIcon/>;
}

// @ts-ignore
function changeThresholdData(multisigClient, threshold) {
    return multisigClient.coder.instruction.encode("change_threshold", {
        threshold: new BN(threshold),
    });
}

// @ts-ignore
function setOwnersData(multisigClient, owners) {
    return multisigClient.coder.instruction.encode("set_owners", {
        owners,
    });
}


// Deterministic IDL address as a function of the program id.
async function idlAddress(programId: PublicKey): Promise<PublicKey> {
    const base = (await PublicKey.findProgramAddress([], programId))[0];
    return await PublicKey.createWithSeed(base, seed(), programId);
}

// Seed for generating the idlAddress.
function seed(): string {
    return "anchor:idl";
}

// The 