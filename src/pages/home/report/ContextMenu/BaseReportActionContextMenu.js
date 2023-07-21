import React from 'react';
import {InteractionManager, View, Keyboard} from 'react-native';
import _ from 'underscore';
import PropTypes from 'prop-types';
import getReportActionContextMenuStyles from '../../../../styles/getReportActionContextMenuStyles';
import ContextMenuItem from '../../../../components/ContextMenuItem';
import {propTypes as genericReportActionContextMenuPropTypes, defaultProps as GenericReportActionContextMenuDefaultProps} from './genericReportActionContextMenuPropTypes';
import withLocalize, {withLocalizePropTypes} from '../../../../components/withLocalize';
import ContextMenuActions, {CONTEXT_MENU_TYPES} from './ContextMenuActions';
import compose from '../../../../libs/compose';
import withWindowDimensions, {windowDimensionsPropTypes} from '../../../../components/withWindowDimensions';
import {withBetas} from '../../../../components/OnyxProvider';
import * as Session from '../../../../libs/actions/Session';
import {hideContextMenu} from './ReportActionContextMenu';
import CONST from '../../../../CONST';
import KeyboardShortcut from '../../../../libs/KeyboardShortcut';

const propTypes = {
    /** String representing the context menu type [LINK, REPORT_ACTION] which controls context menu choices  */
    type: PropTypes.string,
    /** Target node which is the target of ContentMenu */
    anchor: PropTypes.oneOfType([PropTypes.node, PropTypes.object]),
    /** Flag to check if the chat participant is Chronos */
    isChronosReport: PropTypes.bool,
    /** Whether the provided report is an archived room */
    isArchivedRoom: PropTypes.bool,
    contentRef: PropTypes.oneOfType([PropTypes.node, PropTypes.object, PropTypes.func]),
    ...genericReportActionContextMenuPropTypes,
    ...withLocalizePropTypes,
    ...windowDimensionsPropTypes,
};

const defaultProps = {
    type: CONTEXT_MENU_TYPES.REPORT_ACTION,
    anchor: null,
    contentRef: null,
    isChronosReport: false,
    isArchivedRoom: false,
    ...GenericReportActionContextMenuDefaultProps,
};

class BaseReportActionContextMenu extends React.Component {
    constructor(props) {
        super(props);
        this.wrapperStyle = getReportActionContextMenuStyles(this.props.isMini, this.props.isSmallScreenWidth);

        this.state = {
            shouldKeepOpen: false,
            selectedIndex: -1, // Initialize with -1 to indicate no item is selected
        };
    }

    componentWillMount() {
        const keyDown = CONST.KEYBOARD_SHORTCUTS.ARROW_DOWN;
        const keyUp = CONST.KEYBOARD_SHORTCUTS.ARROW_UP;

        const captureOnInputs = true,
            shouldBubble = false,
            priority = 0,
            shouldPreventDefault = true,
            excludedNodes = [];
        KeyboardShortcut.subscribe(
            keyDown.shortcutKey,
            this.handleKeyDown.bind(this),
            keyDown.descriptionKey,
            keyDown.modifiers,
            captureOnInputs,
            shouldBubble,
            priority,
            shouldPreventDefault,
            excludedNodes,
        );
        KeyboardShortcut.subscribe(
            keyUp.shortcutKey,
            this.handleKeyDown.bind(this),
            keyUp.descriptionKey,
            keyUp.modifiers,
            captureOnInputs,
            shouldBubble,
            priority,
            shouldPreventDefault,
            excludedNodes,
        );
    }

    componentWillUnmount() {}

    handleKeyDown = (e) => {
        const {isVisible} = this.props;
        const {selectedIndex} = this.state;
        const visibleMenuItems = this.getVisibleMenuItems();
        const numVisibleMenuItems = visibleMenuItems.length;
        if (isVisible) {
            let nextSelectedIndex = selectedIndex;

            switch (e.code) {
                case 'ArrowUp':
                    e.preventDefault();
                    nextSelectedIndex = (selectedIndex - 1 + numVisibleMenuItems) % numVisibleMenuItems;
                    nextSelectedIndex = nextSelectedIndex === 0 ? numVisibleMenuItems - 1 : nextSelectedIndex;
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    nextSelectedIndex = (selectedIndex + 1) % numVisibleMenuItems;
                    nextSelectedIndex = nextSelectedIndex === 0 ? 1 : nextSelectedIndex;
                    break;
                default:
                    break;
            }

            if (nextSelectedIndex !== selectedIndex) {
                this.setState({selectedIndex: nextSelectedIndex});
            }
        }
    };

    getVisibleMenuItems = () => {
        const shouldShowFilter = (contextAction) =>
            contextAction.shouldShow(
                this.props.type,
                this.props.reportAction,
                this.props.isArchivedRoom,
                this.props.betas,
                this.props.anchor,
                this.props.isChronosReport,
                this.props.reportID,
                this.props.isPinnedChat,
                this.props.isUnreadChat,
            );

        return _.filter(ContextMenuActions, shouldShowFilter);
    };

    render() {
        const {isVisible} = this.props;
        const {shouldKeepOpen, selectedIndex} = this.state;
        const visibleMenuItems = this.getVisibleMenuItems();

        /**
         * Checks if user is anonymous. If true and the action doesn't accept for anonymous user, hides the context menu and
         * shows the sign in modal. Else, executes the callback.
         *
         * @param {Function} callback
         * @param {Boolean} isAnonymousAction
         */
        const interceptAnonymousUser = (callback, isAnonymousAction = false) => {
            if (Session.isAnonymousUser() && !isAnonymousAction) {
                hideContextMenu(false);

                InteractionManager.runAfterInteractions(() => {
                    Session.signOutAndRedirectToSignIn();
                });
            } else {
                callback();
            }
        };
        return (
            (isVisible || shouldKeepOpen) && (
                <View
                    ref={this.props.contentRef}
                    style={this.wrapperStyle}
                >
                    {_.map(visibleMenuItems, (contextAction, index) => {
                        const closePopup = !this.props.isMini;
                        const payload = {
                            reportAction: this.props.reportAction,
                            reportID: this.props.reportID,
                            draftMessage: this.props.draftMessage,
                            selection: this.props.selection,
                            close: () => this.setState({shouldKeepOpen: false}),
                            openContextMenu: () => this.setState({shouldKeepOpen: true}),
                            interceptAnonymousUser,
                        };

                        const isSelected = index === selectedIndex;

                        if (contextAction.renderContent) {
                            // make sure that renderContent isn't mixed with unsupported props
                            if (__DEV__ && (contextAction.text != null || contextAction.icon != null)) {
                                throw new Error('Dev error: renderContent() and text/icon cannot be used together.');
                            }

                            return contextAction.renderContent(closePopup, payload);
                        }

                        return (
                            <ContextMenuItem
                                icon={contextAction.icon}
                                text={this.props.translate(contextAction.textTranslateKey, {action: this.props.reportAction})}
                                successIcon={contextAction.successIcon}
                                successText={contextAction.successTextTranslateKey ? this.props.translate(contextAction.successTextTranslateKey) : undefined}
                                isMini={this.props.isMini}
                                key={contextAction.textTranslateKey}
                                onPress={() => interceptAnonymousUser(() => contextAction.onPress(closePopup, payload), contextAction.isAnonymousAction)}
                                description={contextAction.getDescription(this.props.selection, this.props.isSmallScreenWidth)}
                                isAnonymousAction={contextAction.isAnonymousAction}
                                isSelected={isSelected}
                            />
                        );
                    })}
                </View>
            )
        );
    }
}

BaseReportActionContextMenu.propTypes = propTypes;
BaseReportActionContextMenu.defaultProps = defaultProps;

export default compose(withLocalize, withBetas(), withWindowDimensions)(BaseReportActionContextMenu);
