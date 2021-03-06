import {createFeatureSelector, createSelector} from "@ngrx/store";
import {UnionOf} from "unionize";
import {updateIn} from "hydux-mutator";

import * as fromRoot from "_@web/src/app/store/reducers/root";
import {ACCOUNTS_ACTIONS} from "_@web/src/app/store/actions";
import {WebAccount} from "_@shared/model/account";

export const featureName = "accounts";

export interface State extends fromRoot.State {
    selectedLogin?: string;
    initialized?: boolean;
    accounts: WebAccount[];
}

const initialState: State = {
    accounts: [],
};

export function reducer(state = initialState, action: UnionOf<typeof ACCOUNTS_ACTIONS>): State {
    return ACCOUNTS_ACTIONS.match(action, {
        // TODO consider using "@ngrx/entity" library instead of dealing with a raw array
        WireUpConfigs: ({accountConfigs}) => {
            // remove
            const items = state.accounts.filter(({accountConfig}) => {
                return accountConfigs.some(({login}) => accountConfig.login === login);
            });

            for (const accountConfig of accountConfigs) {
                const {index} = selectAccountByLogin(items, accountConfig.login, false);

                if (index === -1) {
                    // add
                    items.push({
                        accountConfig,
                        progress: {},
                        notifications: {
                            unread: 0,
                            pageType: {url: "", type: "undefined"},
                        },
                    } as WebAccount); // TODO ger rid of "TS as" casting
                } else {
                    const account = items[index];

                    if (JSON.stringify(account.accountConfig) !== JSON.stringify(accountConfig)) {
                        // update
                        items[index] = {
                            ...account,
                            accountConfig,
                        } as WebAccount; // TODO ger rid of "TS as" casting
                    }
                }
            }

            return {
                ...state,
                accounts: items,
                initialized: true,
                selectedLogin: items.some(({accountConfig}) => accountConfig.login === state.selectedLogin)
                    ? state.selectedLogin
                    : items.length ? items[0].accountConfig.login : undefined,
            };
        },
        Activate: ({login}) => {
            return {
                ...state,
                selectedLogin: login,
            };
        },
        NotificationPatch: ({accountConfig, notification}) => {
            const {index} = selectAccountByLogin(state.accounts, accountConfig.login);

            return updateIn(
                state,
                (_) => _.accounts[index].notifications,
                (_) => ({..._, ...notification}),
                [index],
            );
        },
        PatchProgress: ({login, patch}) => {
            const {index} = selectAccountByLogin(state.accounts, login);

            return updateIn(
                state,
                (_) => _.accounts[index].progress,
                (progress) => ({...progress, ...patch}),
                [index],
            );
        },
        default: () => state,
    });
}

function selectAccountByLogin(accounts: WebAccount[], login: string, strict = true) {
    const index = accounts.findIndex(({accountConfig}) => accountConfig.login === login);

    if (strict && index === -1) {
        throw new Error(`Account to process has not been found (login - "${login}")`);
    }

    return {index, account: accounts[index]};
}

export const stateSelector = createFeatureSelector<State>(featureName);
export const initializedSelector = createSelector(stateSelector, ({initialized}) => initialized);
export const accountsSelector = createSelector(stateSelector, ({accounts}) => accounts);
export const selectedLoginSelector = createSelector(stateSelector, ({selectedLogin}) => selectedLogin);
export const selectedAccountSelector = createSelector(
    stateSelector,
    ({selectedLogin, accounts}) => accounts.find(({accountConfig}) => accountConfig.login === selectedLogin),
);
export const accountsUnreadSummarySelector = createSelector(accountsSelector, (accounts) => {
    return accounts.reduce((sum, {notifications}) => sum + notifications.unread, 0);
});
