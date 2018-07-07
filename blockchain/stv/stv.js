function droop_quota(ballots, seats = 1) {
    let voters = 0;

    ballots.forEach(ballot => {
        if (ballot['ballot']) {
            voters += ballot['count'];
        }
    });

    return Math.floor(voters / (seats + 1)) + 1;
}

function tallies(ballots) {
    let tallies_dic = {};

    ballots.forEach(ballot => {
        if (ballot['ballot']) {
            ballot['ballot'].forEach(candidate => {
                tallies_dic[candidate] = 0;
            });
        }
    });

    ballots.forEach(ballot => {
        if (ballot['ballot']) {
            if (ballot['ballot'].length > 0) {
                tallies_dic[ballot['ballot'][0]] += ballot['count'];
            }
        }
    });

    return tallies_dic;

    let result = {};

    for (let candidate in tallies_dic) {
        result[candidate] = tallies_dic[candidate];
    }

    return result;
}

function remove_candidates_from_ballots(candidates, ballots) {
    ballots.forEach(ballot => {
        candidates.forEach(candidate => {
            let index = ballot['ballot'].indexOf(candidate);

            if (-1 !== index) {
                ballot['ballot'].splice(index, 1);
            }
        });
    });

    return ballots;
}

function loser(tallies) {
    let losers = matching_keys(tallies, Math.min(...Object.values(tallies)));

    if (losers.length === 1) {
        return {
            'loser': losers[0],
        }
    }
    else {
        return {
            'tied_losers': losers,
            'loser': break_ties(losers),
        }
    }
}

function break_ties(arr) {
    // TODO: implement break_tie
    return arr[0];
}

function matching_keys(dic, value) {
    let result = [];

    for (let key in dic) {
        if (dic[key] === value) result.push(key);
    }

    return result;
}

function single_transferable_vote(ballots, required_winners = 1) {
    let candidates = new Set();

    ballots.forEach(ballot => {
        ballot['ballot'].forEach(candidate => {
            if (!candidates.has(candidate)) {
                candidates.add(candidate);
            }
        });
    });

    if (candidates < required_winners) {
        console.log('Not enough candidates provides.');
        return null;
    }

    let quota = droop_quota(ballots, required_winners),
        rounds = [],
        winners = new Set(),
        remaining_candidates = set_diff(candidates, winners),
        data = {'candidates': candidates},
        round_cnt = 1;

    while (winners.size < required_winners &&
    remaining_candidates.size + winners.size !== required_winners) {
        console.log('\n\n============================================\n');
        console.log('Round ', round_cnt, ' votes');
        round_cnt++;

        if (!remaining_candidates) {
            remaining_candidates = set_diff(candidates, winners);
        }

        let round = {};

        if (ballots.filter(ballot => ballot['count'] > 0 && ballot['ballot']).length === 0) {
            remaining_candidates = set_diff(candidates, winners);
            round['note'] = 'reset';
            ballots = JSON.parse(JSON.stringify(ballots));

            ballots.forEach(ballot => {
                ballot['ballot'] = ballot['ballot'].filter(x => remaining_candidates.has(x));
            });

            quota = droop_quota(ballots, required_winners - winners.size);
        }

        round['tallies'] = tallies(ballots);

        if (round['tallies']) {
            if (Math.max(...Object.values(round['tallies'])) >= quota) {
                round['winners'] = new Set();

                for (let candidate in round['tallies']) {
                    if (round['tallies'][candidate] >= quota) {
                        round['winners'].add(candidate);
                    }
                }

                let msg = '\n"' + [...round['winners']].join(', ');
                msg += '" has exceeded the quota and is elected. ' +
                    '\nIf there are seats remaining to be filled, ' +
                    'the \nsurplus will now be reallocated.';
                console.log(msg);

                winners = set_union(winners, round['winners']);
                remaining_candidates = set_diff(remaining_candidates, winners);

                ballots.forEach(ballot => {
                    if (ballot['ballot']) {
                        let winner = ballot['ballot'][0];

                        if (round['winners'].has(winner)) {
                            ballot['count'] *= ((round['tallies'][winner] - quota) /
                                round['tallies'][winner]);
                        }
                    }
                });

                ballots = remove_candidates_from_ballots(round['winners'], ballots);
            }
            else {
                round['loser'] = loser(round['tallies'])['loser'];

                if (round['loser']) {
                    let msg = round['loser'];
                    msg = `"${msg}"` + ' is loser and it will be removed.';
                    console.log(msg);
                }

                remaining_candidates = set_diff(remaining_candidates, new Set([round['loser']]));
                ballots = remove_candidates_from_ballots([round['loser']], ballots);
            }
        }

        rounds.push(round);
        console.log('\n');
    }

    if (winners.size < required_winners) {
        winners = set_union(winners, remaining_candidates);
    }

    data['quota'] = quota;
    data['rounds'] = rounds;
    data['remaining_candidates'] = remaining_candidates;
    data['winners'] = winners;

    console.log('The election is complete and the elected candidates are: (',
        [...winners].join(', ') + ')');
    console.log('\n~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n' +
        '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~\n\n');

    return data;
}

function set_diff(a, b) {
    if (b && b.size > 0)
        return new Set([...a].filter(x => !b.has(x)));
    else
        return a;
}

function set_union(a, b) {
    return new Set([...a, ...b]);
}

exports.single_transferable_vote = single_transferable_vote;