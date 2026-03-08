import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  selectorContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modelIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 6, 96, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectorLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  selectorTextContainer: {
    flex: 1,
  },
  selectorText: {
    fontSize: 16,
    fontWeight: '600',
  },
  selectorActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unloadButton: {
    padding: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    alignSelf: 'stretch',
    marginBottom: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  closeButton: {
    padding: 8,
  },
  modelList: {
    paddingBottom: 20,
    paddingHorizontal: 4,
  },
  modelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    marginHorizontal: 4,
  },
  selectedModelItem: {
    backgroundColor: 'rgba(74, 6, 96, 0.1)',
  },
  modelIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(74, 6, 96, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  modelInfo: {
    flex: 1,
  },
  modelName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  selectedModelText: {
    color: '#4a0660',
    fontWeight: '600',
  },
  modelMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modelDetails: {
    fontSize: 14,
  },
  modelTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: 'rgba(74, 6, 96, 0.1)',
  },
  modelTypeText: {
    fontSize: 12,
    color: '#4a0660',
    fontWeight: '500',
  },
  selectedIndicator: {
    marginLeft: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
    marginTop: 24,
    marginBottom: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(150, 150, 150, 0.1)',
    borderRadius: 8,
    backgroundColor: 'rgba(150, 150, 150, 0.05)',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 24,
    maxWidth: 300,
    fontWeight: '500',
  },
  selectorDisabled: {
    opacity: 0.6,
  },
  modelItemDisabled: {
    opacity: 0.6,
  },
  unloadButtonActive: {
    backgroundColor: 'rgba(211, 47, 47, 0.1)',
    borderRadius: 12,
    padding: 4,
  },
  sectionHeader: {
    padding: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  sectionHeaderWithControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeaderToggle: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionRefreshButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modelSectionHeader: {
    backgroundColor: 'rgba(74, 6, 96, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(74, 6, 96, 0.1)',
    borderRadius: 8,
    marginHorizontal: 4,
  },
  onlineModelsHeader: {
    marginTop: 16,
  },
  modelApiKeyMissing: {
    fontSize: 12,
    fontStyle: 'italic',
    marginLeft: 8,
  },
  modelNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  connectionTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: 'rgba(74, 6, 96, 0.1)',
  },
  connectionTypeText: {
    fontSize: 10,
    color: '#4a0660',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modelNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  onlineModelsHeaderWithKeys: {
    borderColor: 'rgba(74, 180, 96, 0.3)',
    backgroundColor: 'rgba(74, 180, 96, 0.05)',
  },
  projectorModelItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginVertical: 4,
    borderRadius: 8,
  },
  projectorModelInfo: {
    flex: 1,
    marginLeft: 12,
  },
  projectorModelName: {
    fontSize: 16,
    fontWeight: '500',
  },
  projectorModelSize: {
    fontSize: 12,
    marginTop: 2,
  },
  projectorLabel: {
    fontSize: 10,
    marginTop: 8,
    marginBottom: 2,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  initPanel: {
    marginHorizontal: 4,
    marginBottom: 4,
  },
  initPanelToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  initPanelToggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 3,
  },
  initPanelActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  initResetIconButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initSliderItem: {
    marginBottom: 12,
  },
  initSliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  projectorNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  projectorText: {
    fontSize: 14,
    fontWeight: '500',
  },
  projectorUnloadButton: {
    backgroundColor: 'rgba(95, 213, 132, 0.1)',
    borderRadius: 12,
  },
  groupCard: {
    borderRadius: 12,
    marginBottom: 8,
    marginHorizontal: 4,
    overflow: 'hidden',
  },
  groupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  groupActions: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
    marginLeft: 8,
  },
  expandButton: {
    padding: 6,
    borderRadius: 12,
  },
  groupFiles: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    borderTopWidth: 1,
    marginHorizontal: 4,
  },
  groupFileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupFileNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  groupFileName: {
    flex: 1,
    fontSize: 13,
  },
  groupFileSize: {
    fontSize: 12,
  },
});
